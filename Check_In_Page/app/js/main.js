document.addEventListener('DOMContentLoaded', () => {
    // --- Configuration ---
    const APP_NAME = "recital-check-in-out";
    const REPORTS = {
        ATTENDANCE: "All_Daily_Attendances",
        ROSTER: "All_Master_Dancer_Rosters",
        CHANGE_ORDER: "All_Change_Orders"
    };

    // --- State ---
    let currentDancer = null;
    let currentAttendance = null;
    let currentChangeOrder = null;
    let capturedPhotoBlob = null;
    let currentUserEmail = "Unknown User";

    // --- Elements ---
    const photoBox = document.getElementById('photo-box');
    const cameraInput = document.getElementById('camera-input');
    const photoPreview = document.getElementById('photo-preview');
    const checkInBtn = document.getElementById('check-in-btn');
    const searchInput = document.querySelector('.search-input');
    const suggestionsContainer = document.getElementById('search-suggestions');
    const viewProfileBtn = document.getElementById('view-profile-btn'); // Need to ensure ID exists
    const profileModal = document.getElementById('profile-modal');
    const closeProfileBtn = document.getElementById('close-profile-modal');
    const profileContent = document.getElementById('profile-content');
    const successModal = document.getElementById('success-modal');
    const successCloseBtn = document.getElementById('success-close-btn');

    // UI Elements for updates
    const ui = {
        dancerPhoto: document.getElementById('dancer-photo'),
        dancerName: document.getElementById('dancer-name'),
        dancerId: document.getElementById('dancer-id-display'),
        statusBadgeMobile: document.getElementById('status-badge-mobile'),
        statusBadgeDesktop: document.getElementById('status-badge-desktop'),
        roomMobile: document.getElementById('room-mobile'),
        roomDesktop: document.getElementById('room-desktop'),
        medicalDesc: document.getElementById('medical-alert-desc'),
        pickupName: document.getElementById('pickup-name'),
        pickupPhone: document.getElementById('pickup-phone')
    };

    if (typeof ZOHO !== 'undefined' && ZOHO.CREATOR) {
        ZOHO.CREATOR.init()
            .then((data) => {
                console.log("Zoho Creator Widget initialized successfully.", data);
                if (data && data.loginUser) {
                    currentUserEmail = data.loginUser;
                }
            })
            .catch(err => {
                console.error("Error initializing Zoho Creator Widget", err);
            });
    }

    // Camera Logic
    if (photoBox && cameraInput) {
        photoBox.addEventListener('click', () => cameraInput.click());
        cameraInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                capturedPhotoBlob = file;
                const reader = new FileReader();
                reader.onload = (e) => {
                    photoPreview.src = e.target.result;
                    photoPreview.style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // QR Scanner Logic
    const qrBtn = document.getElementById('open-qr-scanner');
    const closeQrBtn = document.getElementById('close-qr-scanner');
    const qrModal = document.getElementById('qr-modal');
    let html5QrcodeScanner = null;

    if (qrBtn && qrModal) {
        qrBtn.addEventListener('click', () => {
            qrModal.style.display = 'flex';
            if (!html5QrcodeScanner && typeof Html5QrcodeScanner !== 'undefined') {
                html5QrcodeScanner = new Html5QrcodeScanner(
                    "qr-reader", 
                    { fps: 10, qrbox: { width: 250, height: 250 } },
                    false
                );
                html5QrcodeScanner.render(onScanSuccess, onScanFailure);
            }
        });

        closeQrBtn.addEventListener('click', closeModal);
    }

    function closeModal() {
        if (qrModal) qrModal.style.display = 'none';
        if (html5QrcodeScanner) {
            html5QrcodeScanner.clear().catch(err => console.error(err));
            html5QrcodeScanner = null;
        }
    }

    async function onScanSuccess(decodedText) {
        console.log(`Scanned: ${decodedText}`);
        closeModal();

        // Hide any previous errors and suggestions
        const errorAlert = document.getElementById('error-alert');
        if (errorAlert) errorAlert.style.display = 'none';
        if (suggestionsContainer) suggestionsContainer.style.display = 'none';

        // 1. Extract Internal Dancer ID
        // Format: YDC-RECITAL26-0001|482913|A7K92
        const dancerId = decodedText.split('|')[0];
        
        try {
            await fetchDancerData(dancerId);
        } catch (error) {
            console.error("Error fetching data:", error);
            showAdminReview("Dancer or Attendance not found for today.");
        }
    }

    function onScanFailure(error) {
        // Ignore scan failures
    }

    async function fetchDancerData(internalId) {
        // 1. Fetch Dancer Profile
        const rosterCriteria = `Internal_Dancer_ID == "${internalId}"`;
        const rosterResp = await ZOHO.CREATOR.API.getAllRecords({
            appName: APP_NAME,
            reportName: REPORTS.ROSTER,
            criteria: rosterCriteria
        });

        if (!rosterResp.data || rosterResp.data.length === 0) {
            throw new Error("Dancer not found in Roster");
        }
        currentDancer = rosterResp.data[0];

        // 2. Fetch Daily Attendance for Today
        const attendanceCriteria = `(Dancer.ID == ${currentDancer.ID}) && (Event_Day_Date == today)`;
        const attendanceResp = await ZOHO.CREATOR.API.getAllRecords({
            appName: APP_NAME,
            reportName: REPORTS.ATTENDANCE,
            criteria: attendanceCriteria
        });

        if (!attendanceResp.data || attendanceResp.data.length === 0) {
            throw new Error("Attendance record not found for today");
        }
        currentAttendance = attendanceResp.data[0];

        // 3. Fetch Change Order (Optional)
        try {
            const coCriteria = `(Dancer.ID == ${currentDancer.ID}) && (Requested_Date == today) && (Approval_Status == "Approved")`;
            const coResp = await ZOHO.CREATOR.API.getAllRecords({
                appName: APP_NAME,
                reportName: REPORTS.CHANGE_ORDER,
                criteria: coCriteria
            });
            if (coResp.data && coResp.data.length > 0) {
                currentChangeOrder = coResp.data[0];
            } else {
                currentChangeOrder = null;
            }
        } catch (e) {
            currentChangeOrder = null;
        }

        updateUI();
    }

    function updateUI() {
        if (!currentDancer || !currentAttendance) return;

        // Dancer Info
        const personIcon = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 256 256'%3E%3Crect width='256' height='256' fill='none'/%3E%3Ccircle cx='128' cy='96' r='64' fill='none' stroke='%237A7A8A' stroke-miterlimit='10' stroke-width='16'/%3E%3Cpath d='M31,216a112,112,0,0,1,194,0' fill='none' stroke='%237A7A8A' stroke-linecap='round' stroke-linejoin='round' stroke-width='16'/%3E%3C/svg%3E";

        ui.dancerName.innerHTML = `${currentDancer.Dancer_Full_Name} <span class="status-badge mobile-inline" id="status-badge-mobile"></span>`;
        ui.dancerId.textContent = currentDancer.Internal_Dancer_ID;
        ui.dancerPhoto.src = currentDancer.Dancer_Photo ? getZohoImageUrl(currentDancer.Dancer_Photo) : personIcon;

        // Status
        const status = currentAttendance.Status || "Not Checked In";
        updateStatusBadges(status);

        // Room
        let room = currentAttendance.Room_Today || "N/A";
        if (typeof room === 'object' && room !== null) {
            room = room.display_value || room.ID || "N/A";
        }
        ui.roomMobile.textContent = room;
        ui.roomDesktop.textContent = room;

        // Medical Alert
        const medicalAlert = currentDancer.Medical_Alert === "Yes" || currentDancer.Medical_Alert === true;
        const medicalCard = document.querySelector('.medical-card');
        if (medicalAlert) {
            ui.medicalDesc.textContent = currentDancer.Medical_Details_Description || "Medication on file";
            medicalCard.style.display = "flex";
            medicalCard.classList.add('alert-active');
        } else {
            ui.medicalDesc.textContent = "No alerts on file";
            medicalCard.style.display = "flex"; // Keep it visible but styled normally
            medicalCard.classList.remove('alert-active');
        }

        // Pickup Person (Check Change Order first)
        if (currentChangeOrder) {
            ui.pickupName.innerHTML = `${currentChangeOrder.Replacement_Person_Name} <span class="desktop-relation">(Change Order)</span>`;
            ui.pickupPhone.innerHTML = `<i class="ph ph-phone"></i> ${currentChangeOrder.Replacement_Person_Phone || "N/A"}`;
            document.querySelector('.contact-img').src = currentChangeOrder.Replacement_Person_Photo ? getZohoImageUrl(currentChangeOrder.Replacement_Person_Photo) : personIcon;
            document.getElementById('pickup-badge').innerHTML = `<i class="ph-fill ph-check-circle"></i> Approved Replacement`;
            document.getElementById('pickup-relation-mobile').textContent = "Type: Change Order Override";
        } else {
            ui.pickupName.innerHTML = `${currentDancer.Designated_Pickup_Drop_O_Person_Name || "N/A"} <span class="desktop-relation">(Default)</span>`;
            ui.pickupPhone.innerHTML = `<i class="ph ph-phone"></i> ${currentDancer.Designated_Pickup_Drop_O_Person_Phone || "N/A"}`;
            document.querySelector('.contact-img').src = currentDancer.Designated_Pickup_Drop_O_Person_Photo ? getZohoImageUrl(currentDancer.Designated_Pickup_Drop_O_Person_Photo) : personIcon;
            document.getElementById('pickup-badge').innerHTML = `<i class="ph-fill ph-star"></i> Authorized Adult`;
            document.getElementById('pickup-relation-mobile').textContent = "Type: Default Designated";
        }

        // Parent / Guardian Info
        document.getElementById('guardian-1-name').innerHTML = `${currentDancer.Parent_Guardian_Name || "N/A"} <span style="font-weight:400; color:var(--text-secondary); font-size:0.9rem;">(Primary)</span>`;
        document.getElementById('guardian-1-phone').innerHTML = `<i class="ph ph-phone"></i> ${currentDancer.Parent_Guardian_Phone || "N/A"}`;
        document.getElementById('guardian-1-email').innerHTML = `<i class="ph ph-envelope-simple"></i> ${currentDancer.Parent_Guardian_Email || "N/A"}`;
        
        if (currentDancer.Backup_Emergency_Contact_Name) {
            document.getElementById('guardian-2-name').innerHTML = `${currentDancer.Backup_Emergency_Contact_Name} <span style="font-weight:400; color:var(--text-secondary); font-size:0.9rem;">(Backup)</span>`;
            document.getElementById('guardian-2-phone').innerHTML = `<i class="ph ph-phone"></i> ${currentDancer.Backup_Emergency_Contact_Phone || "N/A"}`;
        }

        // Disable interaction if already checked in
        const photoCard = photoBox.closest('.card');
        if (status === "Checked In" || status === "Checked Out") {
            checkInBtn.disabled = true;
            checkInBtn.innerHTML = `<i class="ph ph-check-circle"></i> Already ${status}`;
            if (photoCard) photoCard.style.display = 'none';
        } else {
            checkInBtn.disabled = false;
            checkInBtn.innerHTML = `<i class="ph ph-check-circle"></i> Check In`;
            if (photoCard) photoCard.style.display = 'block';
        }
    }

    function updateStatusBadges(status) {
        const badges = [ui.statusBadgeMobile, ui.statusBadgeDesktop];
        const colors = {
            "Not Checked In": "red",
            "Checked In": "green",
            "Checked Out": "purple"
        };
        const color = colors[status] || "red";
        
        badges.forEach(badge => {
            if (!badge) return;
            badge.innerHTML = `<i class="ph-fill ph-circle"></i> ${status}`;
            badge.style.color = color;
            badge.style.borderColor = color;
            // Add custom style for background if needed
        });
    }

    function showAdminReview(message) {
        const errorAlert = document.getElementById('error-alert');
        const errorMsg = document.getElementById('error-message');
        if (errorAlert && errorMsg) {
            errorMsg.textContent = message;
            errorAlert.style.display = 'flex';
            // Scroll to top to ensure error is seen
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            alert("Admin Review Required: " + message);
        }
    }

    // Check-In Submission
    if (checkInBtn) {
        checkInBtn.addEventListener('click', async () => {
            if (!currentAttendance) {
                showAdminReview("Please scan a dancer first.");
                return;
            }

            if (!capturedPhotoBlob) {
                showAdminReview("Please capture a drop-off photo first.");
                return;
            }

            checkInBtn.disabled = true;
            checkInBtn.innerHTML = `<i class="ph ph-circle-notch ph-spin"></i> Checking In...`;

            try {
                // 2. Update record
                const updateData = {
                    "Status": "Checked In",
                    "Drop_O_Time": getZohoDateTime(new Date()),
                    "Check_In_Station_User": currentUserEmail
                };

                const updateResp = await ZOHO.CREATOR.API.updateRecord({
                    appName: APP_NAME,
                    reportName: REPORTS.ATTENDANCE,
                    id: currentAttendance.ID,
                    data: { data: updateData }
                });

                if (updateResp.code === 3000) {
                    // 3. Upload Photo
                    await uploadDropOffPhoto(currentAttendance.ID);
                    
                    // Show Success Modal
                    if (successModal) {
                        successModal.style.display = 'flex';
                    } else {
                        alert("Dancer is Checked In!");
                        location.reload();
                    }
                } else {
                    throw new Error(updateResp.message || "Update failed");
                }
            } catch (error) {
                console.error("Check-in error:", error);
                showAdminReview("Check-in failed. Please try again or contact admin.");
                checkInBtn.disabled = false;
                checkInBtn.innerHTML = `<i class="ph ph-check-circle"></i> Check In`;
            }
        });
    }

    async function uploadDropOffPhoto(recordId) {
        if (!capturedPhotoBlob) return;
        
        // Standard SDK uploadFile method
        return ZOHO.CREATOR.API.uploadFile({
            appName: APP_NAME,
            reportName: REPORTS.ATTENDANCE,
            id: recordId,
            fieldName: "Drop_O_Photo",
            file: capturedPhotoBlob
        });
    }

    function getZohoImageUrl(path) {
        if (!path) return "";
        if (path.startsWith('http')) return path;
        
        // Based on user feedback, the environment is in the CA cloud
        const domain = 'https://creatorapp.zohocloud.ca'; 
        
        return `${domain}${path}`;
    }

    if (viewProfileBtn) {
        viewProfileBtn.addEventListener('click', () => {
            if (!currentDancer) {
                showAdminReview("Please scan a dancer first.");
                return;
            }
            populateProfile();
            profileModal.style.display = 'flex';
        });
    }

    if (closeProfileBtn) {
        closeProfileBtn.addEventListener('click', () => {
            profileModal.style.display = 'none';
        });
    }

    if (successCloseBtn) {
        successCloseBtn.addEventListener('click', () => {
            location.reload();
        });
    }

    function populateProfile() {
        if (!currentDancer) return;

        // Helper to format field values (handles Zoho objects)
        const formatValue = (val) => {
            if (val === null || val === undefined || val === "") return "—";
            if (typeof val === 'object') {
                return val.display_value || val.ID || "—";
            }
            return val;
        };

        const sections = [
            {
                title: "Personal Information",
                fields: [
                    { label: "Full Name", value: formatValue(currentDancer.Dancer_Full_Name) },
                    { label: "Internal ID", value: formatValue(currentDancer.Internal_Dancer_ID) },
                    { label: "Class Group", value: formatValue(currentDancer.Class_Group) },
                    { label: "Routine Group", value: formatValue(currentDancer.Routine_Group) },
                    { label: "Default Room", value: formatValue(currentDancer.Default_Room) },
                    { label: "Registration Code", value: formatValue(currentDancer.Parent_Registration_Code) }
                ]
            },
            {
                title: "Contacts & Guardians",
                fields: [
                    { label: "Primary Guardian", value: formatValue(currentDancer.Parent_Guardian_Name) },
                    { label: "Guardian Phone", value: formatValue(currentDancer.Parent_Guardian_Phone) },
                    { label: "Guardian Email", value: formatValue(currentDancer.Parent_Guardian_Email) },
                    { label: "Emergency Contact", value: formatValue(currentDancer.Backup_Emergency_Contact_Name) },
                    { label: "Emergency Phone", value: formatValue(currentDancer.Backup_Emergency_Contact_Phone) },
                    { label: "Pickup Person", value: formatValue(currentDancer.Designated_Pickup_Drop_O_Person_Name) },
                    { label: "Pickup Phone", value: formatValue(currentDancer.Designated_Pickup_Drop_O_Person_Phone) }
                ]
            },
            {
                title: "Medical & Notes",
                fields: [
                    { label: "Medical Alert", value: formatValue(currentDancer.Medical_Alert) },
                    { label: "Medical Details", value: formatValue(currentDancer.Medical_Details_Description) },
                    { label: "Admin Notes", value: formatValue(currentDancer.Admin_Notes) }
                ]
            }
        ];

        const personIcon = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 256 256'%3E%3Crect width='256' height='256' fill='none'/%3E%3Ccircle cx='128' cy='96' r='64' fill='none' stroke='%237A7A8A' stroke-miterlimit='10' stroke-width='16'/%3E%3Cpath d='M31,216a112,112,0,0,1,194,0' fill='none' stroke='%237A7A8A' stroke-linecap='round' stroke-linejoin='round' stroke-width='16'/%3E%3C/svg%3E";
        
        let html = `
            <div class="profile-hero">
                <img src="${currentDancer.Dancer_Photo ? getZohoImageUrl(currentDancer.Dancer_Photo) : personIcon}" class="profile-hero-img">
                <div class="profile-hero-info">
                    <h2>${currentDancer.Dancer_Full_Name}</h2>
                    <p>${currentDancer.Internal_Dancer_ID}</p>
                </div>
            </div>
        `;

        sections.forEach(section => {
            html += `
                <div class="profile-section">
                    <h4 class="profile-section-title">${section.title}</h4>
                    <div class="profile-grid">
                        ${section.fields.map(f => `
                            <div class="profile-field">
                                <label class="profile-label">${f.label}</label>
                                <span class="profile-value ${f.value === "—" ? 'empty' : ''}">${f.value}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        });

        profileContent.innerHTML = html;
    }

    // Search Logic
    let searchDebounce = null;
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            if (searchDebounce) clearTimeout(searchDebounce);
            
            if (query.length < 2) {
                suggestionsContainer.style.display = 'none';
                return;
            }

            searchDebounce = setTimeout(() => fetchSuggestions(query), 500);
        });

        // Hide suggestions when clicking outside
        document.addEventListener('click', (e) => {
            if (!searchInput.contains(e.target) && !suggestionsContainer.contains(e.target)) {
                suggestionsContainer.style.display = 'none';
            }
        });
    }

    async function fetchSuggestions(query) {
        try {
            const criteria = `(Dancer_Full_Name.contains("${query}")) || (Internal_Dancer_ID.contains("${query}"))`;
            const resp = await ZOHO.CREATOR.API.getAllRecords({
                appName: APP_NAME,
                reportName: REPORTS.ROSTER,
                criteria: criteria
            });

            suggestionsContainer.innerHTML = '';
            
            if (resp.data && resp.data.length > 0) {
                resp.data.forEach(item => {
                    const personIcon = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 256 256'%3E%3Crect width='256' height='256' fill='none'/%3E%3Ccircle cx='128' cy='96' r='64' fill='none' stroke='%237A7A8A' stroke-miterlimit='10' stroke-width='16'/%3E%3Cpath d='M31,216a112,112,0,0,1,194,0' fill='none' stroke='%237A7A8A' stroke-linecap='round' stroke-linejoin='round' stroke-width='16'/%3E%3C/svg%3E";
                    const div = document.createElement('div');
                    div.className = 'suggestion-item';
                    div.innerHTML = `
                        <img src="${item.Dancer_Photo ? getZohoImageUrl(item.Dancer_Photo) : personIcon}" class="suggestion-img">
                        <div class="suggestion-info">
                            <span class="suggestion-name">${item.Dancer_Full_Name}</span>
                            <span class="suggestion-id">${item.Internal_Dancer_ID}</span>
                        </div>
                    `;
                    div.addEventListener('click', () => {
                        suggestionsContainer.style.display = 'none';
                        searchInput.value = item.Dancer_Full_Name;
                        fetchDancerData(item.Internal_Dancer_ID);
                    });
                    suggestionsContainer.appendChild(div);
                });
            } else {
                suggestionsContainer.innerHTML = '<div class="no-results">No dancers found</div>';
            }
            suggestionsContainer.style.display = 'block';
        } catch (error) {
            console.error("Search error:", error);
        }
    }

    // Utils
    function getZohoDate(date) {
        const dd = String(date.getDate()).padStart(2, '0');
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const yyyy = date.getFullYear();
        return `${mm}-${dd}-${yyyy}`;
    }

    function getZohoDateTime(date) {
        const dd = String(date.getDate()).padStart(2, '0');
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const yyyy = date.getFullYear();
        const hh = String(date.getHours()).padStart(2, '0');
        const min = String(date.getMinutes()).padStart(2, '0');
        const ss = String(date.getSeconds()).padStart(2, '0');
        return `${mm}-${dd}-${yyyy} ${hh}:${min}:${ss}`;
    }
});
