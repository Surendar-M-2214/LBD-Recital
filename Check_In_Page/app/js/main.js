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

    // Initialize Zoho Creator Widget
    if (typeof ZOHO !== 'undefined' && ZOHO.CREATOR) {
        ZOHO.CREATOR.init()
            .then(() => {
                console.log("Zoho Creator Widget initialized successfully.");
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
        ui.dancerName.innerHTML = `${currentDancer.Dancer_Full_Name} <span class="status-badge mobile-inline" id="status-badge-mobile"></span>`;
        ui.dancerId.textContent = currentDancer.Internal_Dancer_ID;
        if (currentDancer.Dancer_Photo) {
            ui.dancerPhoto.src = getZohoImageUrl(currentDancer.Dancer_Photo);
        }

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
            if (currentChangeOrder.Replacement_Person_Photo) {
                document.querySelector('.contact-img').src = getZohoImageUrl(currentChangeOrder.Replacement_Person_Photo);
            }
            document.getElementById('pickup-badge').innerHTML = `<i class="ph-fill ph-check-circle"></i> Approved Replacement`;
            document.getElementById('pickup-relation-mobile').textContent = "Type: Change Order Override";
        } else {
            ui.pickupName.innerHTML = `${currentDancer.Designated_Pickup_Drop_O_Person_Name || "N/A"} <span class="desktop-relation">(Default)</span>`;
            ui.pickupPhone.innerHTML = `<i class="ph ph-phone"></i> ${currentDancer.Designated_Pickup_Drop_O_Person_Phone || "N/A"}`;
            if (currentDancer.Designated_Pickup_Drop_O_Person_Photo) {
                document.querySelector('.contact-img').src = getZohoImageUrl(currentDancer.Designated_Pickup_Drop_O_Person_Photo);
            }
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
                // 1. Get current user
                const user = await ZOHO.CREATOR.getLoginUser();
                
                // 2. Update record
                const updateData = {
                    "Status": "Checked In",
                    "Drop_O_Time": getZohoDateTime(new Date()),
                    "Check_In_Station_User": user.email || "Unknown User"
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
                    
                    // Reset UI instead of alert
                    location.reload(); 
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

    function populateProfile() {
        if (!currentDancer) return;

        const sections = [
            {
                title: "Personal Information",
                fields: [
                    { label: "Full Name", value: currentDancer.Dancer_Full_Name },
                    { label: "Internal ID", value: currentDancer.Internal_Dancer_ID },
                    { label: "Class Group", value: currentDancer.Class_Group },
                    { label: "Routine Group", value: currentDancer.Routine_Group },
                    { label: "Default Room", value: currentDancer.Default_Room },
                    { label: "Registration Code", value: currentDancer.Parent_Registration_Code }
                ]
            },
            {
                title: "Contacts & Guardians",
                fields: [
                    { label: "Primary Guardian", value: currentDancer.Parent_Guardian_Name },
                    { label: "Guardian Phone", value: currentDancer.Parent_Guardian_Phone },
                    { label: "Guardian Email", value: currentDancer.Parent_Guardian_Email },
                    { label: "Emergency Contact", value: currentDancer.Backup_Emergency_Contact_Name },
                    { label: "Emergency Phone", value: currentDancer.Backup_Emergency_Contact_Phone },
                    { label: "Pickup Person", value: currentDancer.Designated_Pickup_Drop_O_Person_Name },
                    { label: "Pickup Phone", value: currentDancer.Designated_Pickup_Drop_O_Person_Phone }
                ]
            },
            {
                title: "Medical & Notes",
                fields: [
                    { label: "Medical Alert", value: currentDancer.Medical_Alert },
                    { label: "Medical Details", value: currentDancer.Medical_Details_Description },
                    { label: "Admin Notes", value: currentDancer.Admin_Notes }
                ]
            }
        ];

        let html = `
            <div style="display: flex; gap: 24px; margin-bottom: 32px; align-items: center;">
                <img src="${getZohoImageUrl(currentDancer.Dancer_Photo)}" style="width: 120px; height: 120px; border-radius: 12px; object-fit: cover; background: #eee;">
                <div>
                    <h2 style="margin: 0; font-size: 1.8rem; color: var(--text-main);">${currentDancer.Dancer_Full_Name}</h2>
                    <p style="margin: 4px 0 0; color: var(--text-secondary); font-weight: 500;">${currentDancer.Internal_Dancer_ID}</p>
                </div>
            </div>
        `;

        sections.forEach(section => {
            html += `
                <div style="margin-bottom: 32px;">
                    <h4 style="color: var(--primary-color); text-transform: uppercase; letter-spacing: 1px; font-size: 0.85rem; margin-bottom: 16px; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">${section.title}</h4>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px 24px;">
                        ${section.fields.map(f => `
                            <div>
                                <label style="display: block; font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 4px;">${f.label}</label>
                                <span style="font-weight: 500; color: var(--text-main);">${f.value || "—"}</span>
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
                    const div = document.createElement('div');
                    div.className = 'suggestion-item';
                    div.innerHTML = `
                        <img src="${getZohoImageUrl(item.Dancer_Photo)}" class="suggestion-img" onerror="this.src='https://images.unsplash.com/photo-1519689680058-324335c77eba?auto=format&fit=crop&w=150&q=80'">
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
