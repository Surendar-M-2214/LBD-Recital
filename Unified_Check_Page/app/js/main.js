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
    let currentUserEmail = "Unknown User";
    let capturedPhotoBlob = null;

    // --- Constants ---
    const PERSON_ICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 256 256'%3E%3Crect width='256' height='256' fill='none'/%3E%3Ccircle cx='128' cy='96' r='64' fill='none' stroke='%237A7A8A' stroke-miterlimit='10' stroke-width='16'/%3E%3Cpath d='M31,216a112,112,0,0,1,194,0' fill='none' stroke='%237A7A8A' stroke-linecap='round' stroke-linejoin='round' stroke-width='16'/%3E%3C/svg%3E";

    // --- UI Elements ---
    const nav = {
        backBtn: document.getElementById('nav-back-btn'),
        title: document.getElementById('main-title'),
        subtitle: document.getElementById('main-subtitle')
    };

    const ui = {
        search: document.getElementById('dancer-search-input'),
        suggestions: document.getElementById('search-suggestions'),
        viewSearch: document.getElementById('view-search'),
        viewDetail: document.getElementById('view-detail'),

        // Top Info
        dancerPhoto: document.getElementById('dancer-photo'),
        dancerName: document.getElementById('dancer-name-display'),
        room: document.getElementById('room-display'),
        statusBadge: document.getElementById('current-status-badge'),

        // Pickup Details
        coSection: document.getElementById('co-section'),
        coDate: document.getElementById('co-date'),
        coPhoto: document.getElementById('co-photo'),
        coName: document.getElementById('co-name'),
        coPhone: document.getElementById('co-phone'),
        dancerFirstName: document.getElementById('dancer-first-name'),
        defaultPhoto: document.getElementById('default-photo'),
        defaultName: document.getElementById('default-name'),
        defaultPhone: document.getElementById('default-phone'),

        // Counts
        countIn: document.getElementById('count-in'),
        countNot: document.getElementById('count-not'),
        countOut: document.getElementById('count-out'),
        countExpected: document.getElementById('count-expected'),

        // Action Area
        photoBox: document.getElementById('photo-box'),
        cameraInput: document.getElementById('camera-input'),
        photoPreview: document.getElementById('photo-preview'),
        notesInput: document.getElementById('notes-input'),
        charCount: document.querySelector('.char-count'),
        submitBtn: document.getElementById('submit-action'),

        // Success
        successModal: document.getElementById('success-modal'),
        successCloseBtn: document.getElementById('success-close-btn')
    };

    // --- Initialization ---
    if (typeof ZOHO !== 'undefined' && ZOHO.CREATOR) {
        ZOHO.CREATOR.init().then((data) => {
            if (data && data.loginUser) currentUserEmail = data.loginUser;
            showSearchView();
            fetchStats();
        });
    }

    async function fetchStats() {
        try {
            // Get all attendance for today to count statuses
            const resp = await ZOHO.CREATOR.API.getAllRecords({
                appName: APP_NAME, reportName: REPORTS.ATTENDANCE,
                criteria: `(Event_Day_Date == today)`,
                pageSize: 200
            });

            if (resp.data) {
                const counts = { in: 0, not: 0, out: 0, total: resp.data.length };
                resp.data.forEach(r => {
                    if (r.Status === "Checked In") counts.in++;
                    else if (r.Status === "Checked Out") counts.out++;
                    else counts.not++;
                });
                ui.countIn.textContent = counts.in;
                ui.countNot.textContent = counts.not;
                ui.countOut.textContent = counts.out;
                ui.countExpected.textContent = counts.total;
            }
        } catch (e) { console.error("Stats fetch failed", e); }
    }

    // --- Navigation ---
    nav.backBtn.addEventListener('click', showSearchView);

    function showSearchView() {
        ui.viewDetail.style.display = 'none';
        ui.viewSearch.style.display = 'block';
        nav.backBtn.style.display = 'none';
        nav.title.textContent = "Check In/Out";
        nav.subtitle.textContent = "Search or scan a dancer to begin.";
        ui.search.value = "";
        capturedPhotoBlob = null;
        if (ui.photoPreview) ui.photoPreview.style.display = 'none';
        ui.notesInput.value = "";
    }

    // --- QR Scanner Logic ---
    let html5QrcodeScanner = null;
    const scannerModal = document.getElementById('scanner-modal');
    const openScannerBtn = document.getElementById('open-qr-scanner');
    const closeScannerBtn = document.getElementById('close-scanner');

    if (openScannerBtn) {
        openScannerBtn.addEventListener('click', () => {
            scannerModal.style.display = 'flex';
            if (!html5QrcodeScanner) {
                html5QrcodeScanner = new Html5QrcodeScanner(
                    "qr-reader", 
                    { fps: 10, qrbox: { width: 250, height: 250 } },
                    false
                );
                html5QrcodeScanner.render(onScanSuccess, onScanFailure);
            }
        });
    }

    if (closeScannerBtn) {
        closeScannerBtn.addEventListener('click', stopScanner);
    }

    function onScanSuccess(decodedText) {
        if (isVerifyingPerson) {
            // For now, any valid scan during verification mode counts as success
            // In production, you would match decodedText against currentChangeOrder.Replacement_Person_ID
            personVerified = true;
            isVerifyingPerson = false;
            stopScanner();
            updateUI();
        } else {
            const dancerId = decodedText.split('|')[0];
            stopScanner();
            loadDancer(dancerId);
        }
    }

    function onScanFailure(error) {
        // Ignore constant scanning failures
    }

    function stopScanner() {
        if (html5QrcodeScanner) {
            html5QrcodeScanner.clear().catch(err => console.error(err));
            html5QrcodeScanner = null;
        }
        scannerModal.style.display = 'none';
    }

    // --- Search Logic ---
    let searchDebounce = null;
    ui.search.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        if (searchDebounce) clearTimeout(searchDebounce);
        if (query.length < 2) { ui.suggestions.style.display = 'none'; return; }
        searchDebounce = setTimeout(() => fetchSuggestions(query), 400);
    });

    async function fetchSuggestions(query) {
        try {
            const criteria = `(Dancer_Full_Name.contains("${query}")) || (Internal_Dancer_ID.contains("${query}"))`;
            const resp = await ZOHO.CREATOR.API.getAllRecords({ appName: APP_NAME, reportName: REPORTS.ROSTER, criteria: criteria });
            ui.suggestions.innerHTML = '';
            if (resp.data?.length) {
                resp.data.forEach(item => {
                    const div = document.createElement('div');
                    div.className = 'suggestion-item';
                    div.innerHTML = `
                        <img src="${item.Dancer_Photo ? getZohoImageUrl(item.Dancer_Photo) : PERSON_ICON}" class="suggestion-img">
                        <div class="suggestion-info">
                            <span class="suggestion-name" style="font-weight:700;">${item.Dancer_Full_Name}</span>
                            <span class="suggestion-id" style="font-size:0.8rem; color:var(--text-secondary);">${item.Internal_Dancer_ID}</span>
                        </div>
                    `;
                    div.addEventListener('click', () => { ui.suggestions.style.display = 'none'; loadDancer(item.Internal_Dancer_ID); });
                    ui.suggestions.appendChild(div);
                });
                ui.suggestions.style.display = 'block';
            }
        } catch (e) { }
    }

    let personVerified = false;
    let isVerifyingPerson = false;

    // --- Core Data Loading ---
    async function loadDancer(id) {
        try {
            const roster = await ZOHO.CREATOR.API.getAllRecords({ appName: APP_NAME, reportName: REPORTS.ROSTER, criteria: `Internal_Dancer_ID == "${id}"` });
            if (!roster.data?.length) throw new Error("Dancer not found");
            currentDancer = roster.data[0];

            const attendance = await ZOHO.CREATOR.API.getAllRecords({
                appName: APP_NAME, reportName: REPORTS.ATTENDANCE,
                criteria: `(Dancer.ID == ${currentDancer.ID}) && (Event_Day_Date == today)`
            });
            if (!attendance.data?.length) throw new Error("Attendance record not found for today.");
            currentAttendance = attendance.data[0];

            try {
                const co = await ZOHO.CREATOR.API.getAllRecords({
                    appName: APP_NAME, reportName: REPORTS.CHANGE_ORDER,
                    criteria: `(Dancer.ID == ${currentDancer.ID}) && (Requested_Date == today) && (Approval_Status == "Approved")`
                });
                currentChangeOrder = co.data?.[0] || null;
                personVerified = false; // Reset verification for new dancer
                isVerifyingPerson = false;
            } catch (e) { currentChangeOrder = null; }

            updateUI();
        } catch (error) {
            showError(error.message);
        }
    }

    function updateUI() {
        if (!currentDancer || !currentAttendance) return;
        const status = currentAttendance.Status || "Not Checked In";

        // Show detail view
        ui.viewSearch.style.display = 'none';
        ui.viewDetail.style.display = 'block';

        // Top Info Card
        ui.dancerName.textContent = currentDancer.Dancer_Full_Name;
        ui.dancerPhoto.src = currentDancer.Dancer_Photo ? getZohoImageUrl(currentDancer.Dancer_Photo) : PERSON_ICON;

        let room = currentAttendance.Room_Today || "—";
        if (typeof room === 'object') room = room.display_value || "—";
        ui.room.textContent = room;

        // Status Badge
        ui.statusBadge.innerHTML = `<i class="ph-fill ph-circle"></i> ${status}`;
        let statusClass = "status-other";
        if (status === "Checked In") statusClass = "status-green";
        else if (status === "Checked Out") statusClass = "status-red";
        ui.statusBadge.className = "status-badge-main " + statusClass;

        // Pickup Details
        ui.defaultName.textContent = currentDancer.Designated_Pickup_Drop_O_Person_Name || "—";
        ui.defaultPhone.textContent = currentDancer.Designated_Pickup_Drop_O_Person_Phone || "—";
        ui.defaultPhoto.src = currentDancer.Designated_Pickup_Drop_O_Person_Photo ? getZohoImageUrl(currentDancer.Designated_Pickup_Drop_O_Person_Photo) : PERSON_ICON;

        const verifyCard = document.getElementById('mandatory-verify-card');
        const verifyContainer = document.getElementById('co-verify-container');
        const verifiedBadge = document.getElementById('co-verified-badge');
        const verifyBtn = document.getElementById('btn-verify-person');

        if (currentChangeOrder) {
            ui.coSection.style.display = 'block';
            ui.coName.textContent = currentChangeOrder.Replacement_Person_Name || "—";
            ui.coPhone.textContent = currentChangeOrder.Replacement_Person_Phone || "—";
            ui.coPhoto.src = currentChangeOrder.Replacement_Person_Photo ? getZohoImageUrl(currentChangeOrder.Replacement_Person_Photo) : PERSON_ICON;
            ui.coDate.textContent = formatDate(new Date());
            document.getElementById('dancer-first-name-co').textContent = currentDancer.Dancer_Full_Name.split(' ')[0];
            
            // Show verification card
            verifyCard.style.display = 'block';
            
            // Optional Verification Logic (Allowing check-out by default)
            if (personVerified) {
                verifyContainer.style.display = 'none';
                verifiedBadge.style.display = 'flex';
            } else {
                verifyContainer.style.display = 'flex';
                verifiedBadge.style.display = 'none';
                
                verifyBtn.onclick = () => {
                    isVerifyingPerson = true;
                    scannerModal.style.display = 'flex';
                    if (!html5QrcodeScanner) {
                        html5QrcodeScanner = new Html5QrcodeScanner("qr-reader", { fps: 10, qrbox: { width: 250, height: 250 } }, false);
                        html5QrcodeScanner.render(onScanSuccess, onScanFailure);
                    }
                };
            }
            // Enable button regardless for now
            ui.submitBtn.disabled = false;
            ui.submitBtn.style.opacity = "1";
        } else {
            ui.coSection.style.display = 'none';
            verifyCard.style.display = 'none';
            ui.submitBtn.disabled = false;
            ui.submitBtn.style.opacity = "1";
        }

        // Dynamic Header & Action Logic
        nav.backBtn.style.display = 'flex';
        
        if (status === "Checked In") {
            nav.title.textContent = "Check Out";
            nav.subtitle.textContent = "Dancer is currently checked in. Please verify pickup and check out.";
            ui.submitBtn.innerHTML = `<span>Check Out</span> <i class="ph ph-caret-right"></i>`;
            ui.submitBtn.className = "btn-checkout-final";
            if (currentChangeOrder) verifyCard.style.display = 'block';
        } else {
            nav.title.textContent = "Check In";
            nav.subtitle.textContent = "Scan complete. Please verify details and check in.";
            ui.submitBtn.innerHTML = `<span>Check In</span> <i class="ph ph-caret-right"></i>`;
            ui.submitBtn.className = "btn-checkin-final";
            verifyCard.style.display = 'none';
        }

        ui.submitBtn.disabled = false;
        ui.submitBtn.style.opacity = "1";

        // Profile Button Listener
        const profileBtn = document.getElementById('view-profile-btn');
        const profilePopup = document.getElementById('profile-popup');
        const closeProfileBtn = document.getElementById('close-profile-popup');

        if (profileBtn) {
            profileBtn.onclick = () => {
                populateProfile();
                profilePopup.style.display = 'flex';
            };
        }
        if (closeProfileBtn) {
            closeProfileBtn.onclick = () => {
                profilePopup.style.display = 'none';
            };
        }

        function populateProfile() {
            if (!currentDancer) return;

            // Helper to format values (handles Zoho objects and nulls)
            const formatValue = (val) => {
                if (val === null || val === undefined || val === "") return "—";
                if (typeof val === 'object') return val.display_value || val.ID || "—";
                return val;
            };

            const sections = [
                {
                    title: "Personal Information",
                    fields: [
                        { label: "Full Name", val: currentDancer.Dancer_Full_Name },
                        { label: "Internal ID", val: currentDancer.Internal_Dancer_ID },
                        { label: "Class Group", val: currentDancer.Class_Group },
                        { label: "Routine Group", val: currentDancer.Routine_Group },
                        { label: "Default Room", val: currentDancer.Default_Room },
                        { label: "Registration Code", val: currentDancer.Parent_Registration_Code }
                    ]
                },
                {
                    title: "Guardian & Contacts",
                    fields: [
                        { label: "Primary Guardian", val: currentDancer.Parent_Guardian_Name },
                        { label: "Guardian Phone", val: currentDancer.Parent_Guardian_Phone },
                        { label: "Guardian Email", val: currentDancer.Parent_Guardian_Email },
                        { label: "Emergency Contact", val: currentDancer.Backup_Emergency_Contact_Name },
                        { label: "Emergency Phone", val: currentDancer.Backup_Emergency_Contact_Phone }
                    ]
                },
                {
                    title: "Pickup & Medical",
                    fields: [
                        { label: "Designated Pickup", val: currentDancer.Designated_Pickup_Drop_O_Person_Name },
                        { label: "Pickup Phone", val: currentDancer.Designated_Pickup_Drop_O_Person_Phone },
                        { label: "Medical Alert", val: currentDancer.Medical_Alert },
                        { label: "Medical Details", val: currentDancer.Medical_Details_Description },
                        { label: "Admin Notes", val: currentDancer.Admin_Notes }
                    ]
                }
            ];

            document.getElementById('pop-name').textContent = currentDancer.Dancer_Full_Name;
            document.getElementById('pop-id').textContent = currentDancer.Internal_Dancer_ID;
            document.getElementById('pop-photo').src = currentDancer.Dancer_Photo ? getZohoImageUrl(currentDancer.Dancer_Photo) : PERSON_ICON;
            
            let html = '';
            sections.forEach(section => {
                html += `<h4 class="profile-section-title">${section.title}</h4>`;
                html += `<div class="profile-grid">`;
                section.fields.forEach(f => {
                    const v = formatValue(f.val);
                    html += `
                        <div class="profile-field">
                            <span class="profile-label">${f.label}</span>
                            <span class="profile-value">${v}</span>
                        </div>`;
                });
                html += `</div>`;
            });
            document.getElementById('pop-details').innerHTML = html;
        }
    }

    // --- Photo Logic ---
    ui.photoBox.addEventListener('click', () => ui.cameraInput.click());
    ui.cameraInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            capturedPhotoBlob = file;
            const reader = new FileReader();
            reader.onload = (e) => { ui.photoPreview.src = e.target.result; ui.photoPreview.style.display = 'block'; };
            reader.readAsDataURL(file);
        }
    });

    // --- Notes Char Count ---
    ui.notesInput.addEventListener('input', (e) => {
        const len = e.target.value.length;
        ui.charCount.textContent = `${len}/250`;
        if (len > 250) ui.charCount.style.color = "var(--red-text)";
        else ui.charCount.style.color = "var(--text-secondary)";
    });

    // --- Submission ---
    ui.submitBtn.addEventListener('click', async () => {
        if (!currentAttendance) {
            showAdminReview("Please scan a dancer first.");
            return;
        }

        const isCheckingIn = currentAttendance.Status !== "Checked In";
        const actionLabel = isCheckingIn ? "Checking In..." : "Checking Out...";

        if (!capturedPhotoBlob) {
            showAdminReview(`Please capture a ${isCheckingIn ? 'drop-off' : 'pick-up'} photo first.`);
            return;
        }

        ui.submitBtn.disabled = true;
        ui.submitBtn.innerHTML = `<i class="ph ph-circle-notch ph-spin"></i> ${actionLabel}`;

        try {
            let updateData = {
                "Check_In_Station_User": currentUserEmail
            };

            if (isCheckingIn) {
                updateData.Status = "Checked In";
                updateData.Drop_O_Time = getZohoDateTime(new Date());
            } else {
                updateData.Status = "Checked Out";
                updateData.Pick_Up_Time = getZohoDateTime(new Date());
                updateData.Notes = ui.notesInput.value;
            }

            const resp = await ZOHO.CREATOR.API.updateRecord({
                appName: APP_NAME,
                reportName: REPORTS.ATTENDANCE,
                id: currentAttendance.ID,
                data: { data: updateData }
            });

            if (resp.code === 3000) {
                const fieldName = isCheckingIn ? "Drop_O_Photo" : "Pick_Up_Photo";
                await ZOHO.CREATOR.API.uploadFile({
                    appName: APP_NAME,
                    reportName: REPORTS.ATTENDANCE,
                    id: currentAttendance.ID,
                    fieldName: fieldName,
                    file: capturedPhotoBlob
                });
                
                // Show Success Modal with dynamic message
                document.getElementById('success-title').textContent = isCheckingIn ? "Check-In Success!" : "Check-Out Success!";
                document.getElementById('success-message').textContent = isCheckingIn ? "Dancer has been checked in." : "Dancer has been checked out.";
                showSuccess();
            } else {
                throw new Error(resp.message || "Update failed");
            }
        } catch (e) {
            console.error("Submission error:", e);
            showAdminReview(`${isCheckingIn ? 'Check-in' : 'Check-out'} failed. Please try again.`);
            ui.submitBtn.disabled = false;
            ui.submitBtn.innerHTML = `<span>${isCheckingIn ? 'Check In' : 'Check Out'}</span> <i class="ph ph-caret-right"></i>`;
        }
    });

    function showSuccess() {
        ui.successModal.style.display = 'flex';
    }

    ui.successCloseBtn.addEventListener('click', () => {
        ui.successModal.style.display = 'none';
        nav.backBtn.click();
        fetchStats();
    });

    // --- Helpers ---
    function showAdminReview(message) {
        const errorAlert = document.getElementById('error-alert');
        const errorMsg = document.getElementById('error-message');
        const closeBtn = document.getElementById('close-error-btn');

        if (errorAlert && errorMsg) {
            errorMsg.textContent = message;
            errorAlert.style.display = 'flex';
            window.scrollTo({ top: 0, behavior: 'smooth' });

            if (closeBtn) {
                closeBtn.onclick = () => errorAlert.style.display = 'none';
            }
        } else {
            alert("Admin Review Required: " + message);
        }
    }

    function getZohoImageUrl(path) {
        if (!path) return PERSON_ICON;
        return path.startsWith('http') ? path : `https://creatorapp.zohocloud.ca${path}`;
    }

    function formatDate(date) {
        const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        return `${months[date.getMonth()]} ${date.getDate()}`;
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
