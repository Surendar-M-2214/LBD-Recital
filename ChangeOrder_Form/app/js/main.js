document.addEventListener('DOMContentLoaded', () => {

    // --- State ---
    let replacementPhotoBase64 = "";
    let fetchedDancers = [];
    let selectedDancers = [];
    let availableEventDates = [];
    let selectedDates = [];

    // --- DOM Elements ---
    const parentCodeInput = document.getElementById('co-parent-code');
    const fetchBtn = document.getElementById('btn-fetch-dancers');
    const verifyFeedback = document.getElementById('co-verify-feedback');
    const verificationSection = document.getElementById('co-verification-section');
    const mainForm = document.getElementById('co-main-form');
    
    const submitBtn = document.getElementById('co-submit-btn');
    const requestedDateSelect = document.getElementById('co-requested-date');
    const reasonText = document.getElementById('co-reason');

    // Custom Select Elements
    const dancerSelectBox = document.getElementById('co-dancer-select-box');
    const dancerOptionsContainer = document.getElementById('co-dancer-options');
    const dancerSelectText = document.getElementById('co-dancer-select-text');

    const dateSelectBox = document.getElementById('co-date-select-box');
    const dateOptionsContainer = document.getElementById('co-date-options');
    const dateSelectText = document.getElementById('co-date-select-text');

    // Photo Input
    const fileInput = document.getElementById('co-rep-photo');
    const uploadBox = fileInput ? fileInput.closest('.file-upload-box') : null;

    // --- Helper function for Mobile/Desktop inputs ---
    function getInputValue(desktopId, mobileId) {
        const desktopEl = document.getElementById(desktopId);
        const mobileEl = document.getElementById(mobileId);
        let dVal = desktopEl ? desktopEl.value.trim() : "";
        let mVal = mobileEl ? mobileEl.value.trim() : "";
        return dVal || mVal;
    }

    function getChangeType() {
        const activeCard = document.querySelector('.type-card.active .type-title');
        return activeCard ? activeCard.textContent.trim() : 'Both';
    }

    // --- Parent Verification & Fetching ---
    if (fetchBtn) {
        fetchBtn.addEventListener('click', async () => {
            const code = parentCodeInput.value.trim();
            if (!code) {
                verifyFeedback.textContent = "Please enter a valid Parent Registration Code.";
                verifyFeedback.style.display = "block";
                return;
            }

            fetchBtn.disabled = true;
            fetchBtn.innerHTML = '<i data-feather="loader" class="spin"></i> Fetching...';
            if (typeof feather !== 'undefined') feather.replace();
            verifyFeedback.style.display = "none";

            try {
                if (typeof API !== 'undefined' && API.fetchDancer) {
                    const response = await API.fetchDancer(code);
                    
                    let resultData = response.result;
                    if (typeof resultData === 'string') {
                        try { resultData = JSON.parse(resultData); } catch (e) { }
                    }
                    
                    if (response.code === 3000 && resultData && resultData.status === 'success' && resultData.data && resultData.data.length > 0) {
                        fetchedDancers = resultData.data;
                        renderDancerDropdown();
                        extractAndRenderEventDates();
                        
                        // Hide verification, show main form
                        verificationSection.style.display = 'none';
                        mainForm.style.display = 'flex';
                    } else {
                        verifyFeedback.textContent = (resultData && resultData.message) ? resultData.message : "Invalid Code. No dancers found.";
                        verifyFeedback.style.display = "block";
                    }
                } else {
                    verifyFeedback.textContent = "API module not loaded.";
                    verifyFeedback.style.display = "block";
                }
            } catch (error) {
                console.error('Fetch error:', error);
                verifyFeedback.textContent = "Network error. Please try again.";
                verifyFeedback.style.display = "block";
            } finally {
                fetchBtn.disabled = false;
                fetchBtn.innerHTML = 'Verify & Fetch';
            }
        });
    }

    // --- Custom Dropdown Logic ---
    function renderDancerDropdown() {
        dancerOptionsContainer.innerHTML = '';
        selectedDancers = [];
        updateDancerSelectText();

        // Add "Select All" option
        const selectAllItem = document.createElement('label');
        selectAllItem.className = 'dropdown-item select-all-item';
        selectAllItem.innerHTML = `
            <input type="checkbox" id="co-select-all-checkbox">
            <span>Select All Dancers</span>
        `;
        dancerOptionsContainer.appendChild(selectAllItem);

        const selectAllCheckbox = selectAllItem.querySelector('#co-select-all-checkbox');

        // Add Individual Dancers
        fetchedDancers.forEach(dancer => {
            const item = document.createElement('label');
            item.className = 'dropdown-item';
            item.innerHTML = `
                <input type="checkbox" class="dancer-checkbox" value="${dancer.ID}" data-name="${dancer.Dancer_Full_Name}">
                <span>${dancer.Dancer_Full_Name}</span>
            `;
            dancerOptionsContainer.appendChild(item);
        });

        const dancerCheckboxes = document.querySelectorAll('.dancer-checkbox');

        // Handle Select All
        selectAllCheckbox.addEventListener('change', (e) => {
            const isChecked = e.target.checked;
            dancerCheckboxes.forEach(cb => {
                cb.checked = isChecked;
            });
            updateSelectedDancers();
        });

        // Handle Individual Checkboxes
        dancerCheckboxes.forEach(cb => {
            cb.addEventListener('change', () => {
                const allChecked = Array.from(dancerCheckboxes).every(c => c.checked);
                selectAllCheckbox.checked = allChecked;
                updateSelectedDancers();
            });
        });
    }

    function updateSelectedDancers() {
        const checkboxes = document.querySelectorAll('.dancer-checkbox:checked');
        selectedDancers = Array.from(checkboxes).map(cb => ({
            id: cb.value,
            name: cb.dataset.name
        }));
        updateDancerSelectText();
    }

    function updateDancerSelectText() {
        if (selectedDancers.length === 0) {
            dancerSelectText.textContent = "Select dancer(s)";
            dancerSelectText.style.color = "var(--text-muted)";
        } else if (selectedDancers.length === 1) {
            dancerSelectText.textContent = selectedDancers[0].name;
            dancerSelectText.style.color = "var(--text-main)";
        } else {
            dancerSelectText.textContent = `${selectedDancers.length} dancers selected`;
            dancerSelectText.style.color = "var(--text-main)";
        }
    }

    // Toggle Dropdown Visibility
    if (dancerSelectBox) {
        dancerSelectBox.addEventListener('click', (e) => {
            e.stopPropagation();
            dancerOptionsContainer.classList.toggle('open');
        });
    }

    // Close Dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (dancerOptionsContainer && dancerOptionsContainer.classList.contains('open') && !e.target.closest('#co-dancer-dropdown-wrap')) {
            dancerOptionsContainer.classList.remove('open');
        }
        if (dateOptionsContainer && dateOptionsContainer.classList.contains('open') && !e.target.closest('#co-date-dropdown-wrap')) {
            dateOptionsContainer.classList.remove('open');
        }
    });

    // Date Dropdown Visibility
    if (dateSelectBox) {
        dateSelectBox.addEventListener('click', (e) => {
            e.stopPropagation();
            dateOptionsContainer.classList.toggle('open');
            if (dancerOptionsContainer) dancerOptionsContainer.classList.remove('open');
        });
    }

    if (dancerSelectBox) {
        dancerSelectBox.addEventListener('click', (e) => {
            if (dateOptionsContainer) dateOptionsContainer.classList.remove('open');
        });
    }

    // --- Dynamic Event Dates ---
    function extractAndRenderEventDates() {
        // Extract unique dates from all fetched dancers' Event_Days
        const dateMap = new Map(); // Use Map to prevent duplicates: date -> Event_Name
        
        fetchedDancers.forEach(dancer => {
            if (dancer.Event_Days && Array.isArray(dancer.Event_Days)) {
                dancer.Event_Days.forEach(event => {
                    if (event.Event_Date) {
                        // Store the ID as well if it exists
                        dateMap.set(event.Event_Date, { 
                            name: event.Event_Name || event.Event_Date, 
                            id: event.ID,
                            mainEventId: event.Main_Event_ID 
                        });
                    }
                });
            }
        });

        availableEventDates = Array.from(dateMap.entries()).map(([date, data]) => ({ 
            date, 
            name: data.name, 
            id: data.id,
            mainEventId: data.mainEventId 
        }));
        
        // Sort dates chronologically
        availableEventDates.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        // Clear options
        if (dateOptionsContainer) dateOptionsContainer.innerHTML = '';
        
        // Reset State
        selectedDates = [];
        updateDateSelectText();

        // Add Select All for Dates
        const selectAllItem = document.createElement('label');
        selectAllItem.className = 'dropdown-item';
        selectAllItem.style.borderBottom = '2px solid var(--border-light)';
        selectAllItem.innerHTML = `
            <input type="checkbox" id="co-date-select-all">
            <span style="font-weight: 600;">Select All Dates</span>
        `;
        dateOptionsContainer.appendChild(selectAllItem);

        const selectAllCheckbox = selectAllItem.querySelector('#co-date-select-all');

        // Populate Individual Dates
        availableEventDates.forEach(eventObj => {
            const item = document.createElement('label');
            item.className = 'dropdown-item date-item';
            item.innerHTML = `
                <input type="checkbox" class="date-checkbox" value="${eventObj.id}" data-date="${eventObj.date}" data-name="${eventObj.name}" data-main-event-id="${eventObj.mainEventId || ""}">
                <span>${eventObj.date} - ${eventObj.name}</span>
            `;
            dateOptionsContainer.appendChild(item);
        });

        const dateCheckboxes = document.querySelectorAll('.date-checkbox');

        // Handle Select All
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', (e) => {
                const isChecked = e.target.checked;
                dateCheckboxes.forEach(cb => {
                    cb.checked = isChecked;
                });
                updateSelectedDates();
            });
        }

        // Handle Individual Checkboxes
        dateCheckboxes.forEach(cb => {
            cb.addEventListener('change', () => {
                if (selectAllCheckbox) {
                    const allChecked = Array.from(dateCheckboxes).every(c => c.checked);
                    selectAllCheckbox.checked = allChecked;
                }
                updateSelectedDates();
            });
        });
    }

    function updateSelectedDates() {
        const checkboxes = document.querySelectorAll('.date-checkbox:checked');
        selectedDates = Array.from(checkboxes).map(cb => ({
            id: cb.value,
            date: cb.dataset.date,
            name: cb.dataset.name,
            mainEventId: cb.dataset.mainEventId
        }));
        updateDateSelectText();
    }

    function updateDateSelectText() {
        if (selectedDates.length === 0) {
            if (dateSelectText) {
                dateSelectText.textContent = "Select event date(s)";
                dateSelectText.style.color = "var(--text-muted)";
            }
        } else if (selectedDates.length === 1) {
            if (dateSelectText) {
                dateSelectText.textContent = `${selectedDates[0].date} - ${selectedDates[0].name}`;
                dateSelectText.style.color = "var(--text-main)";
            }
        } else {
            if (dateSelectText) {
                dateSelectText.textContent = `${selectedDates.length} dates selected`;
                dateSelectText.style.color = "var(--text-main)";
            }
        }
    }

    // --- Photo Upload Logic ---
    if (fileInput) {
        const previewContainer = document.createElement('div');
        previewContainer.className = 'image-preview-container';
        previewContainer.style.display = 'none';
        previewContainer.style.marginTop = '10px';
        previewContainer.style.position = 'relative';

        const previewImage = document.createElement('img');
        previewImage.className = 'image-preview';
        previewImage.style.width = '100px';
        previewImage.style.height = '100px';
        previewImage.style.objectFit = 'cover';
        previewImage.style.borderRadius = '8px';

        const removeBtn = document.createElement('button');
        removeBtn.innerHTML = '×'; 
        removeBtn.className = 'btn-remove-image';
        removeBtn.type = 'button'; 
        removeBtn.title = 'Remove image';

        previewContainer.appendChild(previewImage);
        previewContainer.appendChild(removeBtn);
        uploadBox.appendChild(previewContainer);
        
        if (typeof feather !== 'undefined') feather.replace();

        fileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    const img = new Image();
                    img.src = event.target.result;
                    img.onload = function() {
                        // Create canvas for compression
                        const canvas = document.createElement('canvas');
                        let width = img.width;
                        let height = img.height;
                        const maxSide = 800;

                        if (width > height) {
                            if (width > maxSide) {
                                height *= maxSide / width;
                                width = maxSide;
                            }
                        } else {
                            if (height > maxSide) {
                                width *= maxSide / height;
                                height = maxSide;
                            }
                        }

                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, width, height);

                        // Compress and store
                        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
                        replacementPhotoBase64 = compressedBase64;
                        previewImage.src = compressedBase64;
                        previewContainer.style.display = 'flex';
                        uploadBox.querySelector('.upload-content-wrap').style.display = 'none';
                    };
                };
                reader.readAsDataURL(file);
            }
        });

        removeBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            replacementPhotoBase64 = '';
            fileInput.value = '';
            previewContainer.style.display = 'none';
            uploadBox.querySelector('.upload-content-wrap').style.display = 'flex';
        });
    }

    // --- Submit Logic ---
    if (submitBtn) {
        submitBtn.addEventListener('click', async () => {
            
            const changeType = getChangeType();
            
            const repName = getInputValue('co-rep-name-desktop', 'co-rep-name-mobile');
            const repPhone = getInputValue('co-rep-phone-desktop', 'co-rep-phone-mobile');
            const repEmailEl = document.getElementById('co-rep-email-mobile');
            const repEmailStr = repEmailEl ? repEmailEl.value.trim() : "";

            const subName = getInputValue('co-sub-name-desktop', 'co-sub-name-mobile');
            const subEmail = getInputValue('co-sub-email-desktop', 'co-sub-email-mobile');
            const subPhoneEl = document.getElementById('co-sub-phone-mobile');
            const subPhone = subPhoneEl ? subPhoneEl.value.trim() : "";

            const notes = reasonText ? reasonText.value.trim() : "";

            // Mandatory Validation
            const formError = document.getElementById('co-form-error');
            if (formError) formError.style.display = 'none';

            // Reset all errors
            document.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));

            let hasError = false;
            let firstErrorEl = null;

            const isMobile = window.innerWidth <= 1024;

            if (selectedDancers.length === 0) {
                const el = document.getElementById('co-dancer-select-box');
                if(el) { el.classList.add('input-error'); if(!firstErrorEl) firstErrorEl = el; }
                hasError = true;
            }
            
            if (selectedDates.length === 0) {
                if (dateSelectBox) {
                    dateSelectBox.classList.add('input-error');
                    if (!firstErrorEl) firstErrorEl = dateSelectBox;
                }
                hasError = true;
            }

            if (!repName) {
                const el = document.getElementById(isMobile ? 'co-rep-name-mobile' : 'co-rep-name-desktop');
                if(el) { el.classList.add('input-error'); if(!firstErrorEl) firstErrorEl = el; }
                hasError = true;
            }
            if (!repPhone) {
                const el = document.getElementById(isMobile ? 'co-rep-phone-mobile' : 'co-rep-phone-desktop');
                if(el) { el.classList.add('input-error'); if(!firstErrorEl) firstErrorEl = el; }
                hasError = true;
            }

            if (!subName) {
                const el = document.getElementById(isMobile ? 'co-sub-name-mobile' : 'co-sub-name-desktop');
                if(el) { el.classList.add('input-error'); if(!firstErrorEl) firstErrorEl = el; }
                hasError = true;
            }
            if (!subEmail) {
                const el = document.getElementById(isMobile ? 'co-sub-email-mobile' : 'co-sub-email-desktop');
                if(el) { el.classList.add('input-error'); if(!firstErrorEl) firstErrorEl = el; }
                hasError = true;
            }

            if (!replacementPhotoBase64) {
                const el = document.getElementById('co-rep-photo') ? document.getElementById('co-rep-photo').closest('.file-upload-box') : null;
                if(el) { el.classList.add('input-error'); if(!firstErrorEl) firstErrorEl = el; }
                hasError = true;
            }

            if (hasError) {
                if (formError) {
                    formError.textContent = "Please fill out all mandatory fields highlighted in red.";
                    formError.style.display = "block";
                }
                if (firstErrorEl) firstErrorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return;
            }

            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i data-feather="loader" class="spin"></i> Submitting...';
            if (typeof feather !== 'undefined') feather.replace();

            try {
                if (typeof API !== 'undefined' && API.submitChangeOrder) {
                    
                    // Loop through selected dancers and submit separate orders
                    const promises = selectedDancers.map(dancer => {
                        const payload = {
                            Dancer_ID: dancer.id,
                            Dancer_Name: dancer.name,
                            Event_ID: selectedDates.length > 0 ? selectedDates[0].mainEventId : "",
                            Event_Day_IDs: selectedDates.map(d => d.id),
                            Dates_Display_String: selectedDates.map(d => `${d.date} - ${d.name}`).join(", "),
                            Change_Type: changeType,
                            Replacement_Person_Name: repName,
                            Replacement_Person_Phone: repPhone,
                            Replacement_Person_Email: repEmailStr,
                            Replacement_Person_Photo_Base64: replacementPhotoBase64,
                            Submitted_By_Name: subName,
                            Submitted_By_Phone: subPhone,
                            Submitted_By_Email: subEmail,
                            Reason_Notes: notes
                        };
                        return API.submitChangeOrder(payload);
                    });

                    const results = await Promise.all(promises);
                    
                    // Check if all succeeded
                    const allSuccess = results.every(res => {
                        let resultData = res.result;
                        if (typeof resultData === 'string') {
                            try { resultData = JSON.parse(resultData); } catch(e){}
                        }
                        return res.code === 3000 && resultData && resultData.status === 'success';
                    });
                    
                    if (allSuccess) {
                        alert('Change Order(s) Submitted Successfully!');
                        window.location.reload();
                    } else {
                        alert('Some submissions failed. Please check with administration.');
                        console.error("Submission results:", results);
                        submitBtn.disabled = false;
                        submitBtn.innerHTML = '<i data-feather="filter"></i> Submit Change Order';
                        if (typeof feather !== 'undefined') feather.replace();
                    }
                } else {
                    console.warn("API module not loaded.");
                    alert("API Module not found.");
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<i data-feather="filter"></i> Submit Change Order';
                }
            } catch (error) {
                console.error('Submission Error:', error);
                alert('A network error occurred while submitting.');
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i data-feather="filter"></i> Submit Change Order';
                if (typeof feather !== 'undefined') feather.replace();
            }
        });
    }

});
