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
    const checkOutBtn = document.getElementById('check-out-btn');
    const notesInput = document.getElementById('notes-input');
    const charCount = document.getElementById('char-count');
    const searchInput = document.querySelector('.search-input');
    const suggestionsContainer = document.getElementById('search-suggestions');

    // UI Elements
    const ui = {
        dancerPhoto: document.getElementById('dancer-photo'),
        dancerName: document.getElementById('dancer-name'),
        roomDisplay: document.getElementById('room-display'),
        statusBadge: document.getElementById('status-badge'),
        coTitle: document.getElementById('co-title'),
        coName: document.getElementById('co-name'),
        coPhone: document.getElementById('co-phone'),
        coPhoto: document.getElementById('co-photo'),
        defaultName: document.getElementById('default-pickup-name'),
        defaultPhone: document.getElementById('default-pickup-phone'),
        defaultPhoto: document.getElementById('default-pickup-photo')
    };

    // Initialize Zoho Creator Widget
    if (typeof ZOHO !== 'undefined' && ZOHO.CREATOR) {
        ZOHO.CREATOR.init()
            .then(() => {
                console.log("Zoho Creator Widget initialized successfully for Check-Out.");
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

    // Notes Logic
    if (notesInput && charCount) {
        notesInput.addEventListener('input', (e) => {
            charCount.textContent = `${e.target.value.length}/250`;
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

        const errorAlert = document.getElementById('error-alert');
        if (errorAlert) errorAlert.style.display = 'none';
        if (suggestionsContainer) suggestionsContainer.style.display = 'none';

        const dancerId = decodedText.split('|')[0];
        try {
            await fetchDancerData(dancerId);
        } catch (error) {
            console.error("Error fetching data:", error);
            showAdminReview("Dancer or Attendance not found for today.");
        }
    }

    function onScanFailure(error) {}

    async function fetchDancerData(internalId) {
        // 1. Fetch Dancer Profile
        const rosterResp = await ZOHO.CREATOR.API.getAllRecords({
            appName: APP_NAME,
            reportName: REPORTS.ROSTER,
            criteria: `Internal_Dancer_ID == "${internalId}"`
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
                appName: APP_NAME, reportName: REPORTS.CHANGE_ORDER, criteria: coCriteria
            });
            currentChangeOrder = (coResp.data && coResp.data.length > 0) ? coResp.data[0] : null;
        } catch (e) { currentChangeOrder = null; }

        updateUI();
    }

    function updateUI() {
        if (!currentDancer || !currentAttendance) return;

        ui.dancerName.textContent = currentDancer.Dancer_Full_Name;
        ui.roomDisplay.textContent = currentAttendance.Room_Today || "N/A";
        if (currentDancer.Dancer_Photo) {
            ui.dancerPhoto.src = getZohoImageUrl(currentDancer.Dancer_Photo);
        }

        // Status
        const status = currentAttendance.Status || "Checked In";
        ui.statusBadge.innerHTML = `<i class="ph-fill ph-check-circle"></i> ${status}`;
        ui.statusBadge.className = status === "Checked Out" ? "status-badge-purple" : "status-badge-green";

        // Default Pickup
        ui.defaultName.textContent = currentDancer.Designated_Pickup_Drop_O_Person_Name || "N/A";
        ui.defaultPhone.textContent = currentDancer.Designated_Pickup_Drop_O_Person_Phone || "N/A";
        if (currentDancer.Designated_Pickup_Drop_O_Person_Photo) {
            ui.defaultPhoto.src = getZohoImageUrl(currentDancer.Designated_Pickup_Drop_O_Person_Photo);
        }

        // Change Order
        const coSection = document.querySelector('.approved-pickup-desktop-style');
        const coMobile = document.querySelector('.approved-pickup-mobile-style');
        if (currentChangeOrder) {
            coSection.style.display = 'block';
            coMobile.style.display = 'block';
            ui.coName.textContent = currentChangeOrder.Replacement_Person_Name;
            ui.coPhone.textContent = currentChangeOrder.Replacement_Person_Phone;
            if (currentChangeOrder.Replacement_Person_Photo) {
                ui.coPhoto.src = getZohoImageUrl(currentChangeOrder.Replacement_Person_Photo);
            }
        } else {
            coSection.style.display = 'none';
            coMobile.style.display = 'none';
        }
    }

    function showAdminReview(message) {
        const errorAlert = document.getElementById('error-alert');
        const errorMsg = document.getElementById('error-message');
        if (errorAlert && errorMsg) {
            errorMsg.textContent = message;
            errorAlert.style.display = 'flex';
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            alert("Admin Review Required: " + message);
        }
    }

    // Check-Out Submission
    if (checkOutBtn) {
        checkOutBtn.addEventListener('click', async () => {
            if (!currentAttendance) {
                showAdminReview("Please scan a dancer first.");
                return;
            }

            if (!capturedPhotoBlob) {
                showAdminReview("Please capture a pickup photo first.");
                return;
            }

            checkOutBtn.disabled = true;
            checkOutBtn.innerHTML = `<i class="ph ph-circle-notch ph-spin"></i> Checking Out...`;

            try {
                const user = await ZOHO.CREATOR.getLoginUser();
                
                const updateData = {
                    "Status": "Checked Out",
                    "Pick_Up_Time": getZohoDateTime(new Date()),
                    "Check_Out_Station_User": user.email || "Unknown User",
                    "Notes": notesInput.value
                };

                const updateResp = await ZOHO.CREATOR.API.updateRecord({
                    appName: APP_NAME,
                    reportName: REPORTS.ATTENDANCE,
                    id: currentAttendance.ID,
                    data: { data: updateData }
                });

                if (updateResp.code === 3000) {
                    // Upload Photo
                    await uploadPickUpPhoto(currentAttendance.ID);
                    
                    location.reload();
                } else {
                    throw new Error(updateResp.message || "Update failed");
                }
            } catch (error) {
                console.error("Check-out error:", error);
                showAdminReview("Check-out failed. Please try again or contact admin.");
                checkOutBtn.disabled = false;
                checkOutBtn.innerHTML = `Check Out <i class="ph ph-caret-right"></i>`;
            }
        });
    }

    async function uploadPickUpPhoto(recordId) {
        if (!capturedPhotoBlob) return;
        return ZOHO.CREATOR.API.uploadFile({
            appName: APP_NAME,
            reportName: REPORTS.ATTENDANCE,
            id: recordId,
            fieldName: "Pick_Up_Photo",
            file: capturedPhotoBlob
        });
    }

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
                appName: APP_NAME, reportName: REPORTS.ROSTER, criteria: criteria
            });

            suggestionsContainer.innerHTML = '';
            if (resp.data && resp.data.length > 0) {
                resp.data.forEach(item => {
                    const div = document.createElement('div');
                    div.className = 'suggestion-item';
                    div.style.cssText = "padding: 12px 16px; display: flex; align-items: center; gap: 12px; cursor: pointer; border-bottom: 1px solid #F6F4FE;";
                    div.innerHTML = `
                        <img src="${getZohoImageUrl(item.Dancer_Photo)}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">
                        <div style="display: flex; flex-direction: column;">
                            <span style="font-weight: 600; font-size: 0.95rem;">${item.Dancer_Full_Name}</span>
                            <span style="font-size: 0.8rem; color: #7A7A8A;">${item.Internal_Dancer_ID}</span>
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
                suggestionsContainer.innerHTML = '<div style="padding: 16px; text-align: center; color: #7A7A8A;">No dancers found</div>';
            }
            suggestionsContainer.style.display = 'block';
        } catch (error) {
            console.error("Search error:", error);
        }
    }

    function getZohoImageUrl(path) {
        if (!path) return "";
        if (path.startsWith('http')) return path;
        const domain = 'https://creatorapp.zohocloud.ca';
        return `${domain}${path}`;
    }
});
