document.addEventListener('DOMContentLoaded', () => {
    // --- State & Elements ---
    let currentStep = 1;
    const totalSteps = 5;

    let fetchedChildren = [];
    let selectedChild = null;

    // Elements
    const steps = document.querySelectorAll('.step');
    const tabs = document.querySelectorAll('.tab-pane');
    const btnNext = document.getElementById('btn-next');
    const btnAddAnother = document.getElementById('btn-add-another');

    // Summary Elements (Desktop Only)
    const summaryDancer = document.getElementById('summary-dancer');
    const summaryRoom = document.getElementById('summary-room');
    const summaryClass = document.getElementById('summary-class');

    // Inputs
    const inputDancerFirst = document.getElementById('dancer-first-name');
    const inputDancerLast = document.getElementById('dancer-last-name');
    const inputDancerRoom = document.getElementById('dancer-room-id');
    const inputDancerClass = document.getElementById('dancer-class-group');
    const inputParentName = document.getElementById('parent-name');

    // Verification Inputs
    const inputRegCode = document.getElementById('parent-registration-code');
    const btnVerify = document.getElementById('btn-verify');
    const verifyFeedback = document.getElementById('verify-feedback');

    // Base64 storage
    const base64Images = {
        dancerPhoto: '',
        pickupPhoto: ''
    };

    // --- Navigation Logic ---
    function isMobile() {
        return window.innerWidth <= 1024;
    }

    function updateStepper(stepNum) {
        steps.forEach((step, index) => {
            const sNum = index + 1;
            step.classList.remove('active', 'completed');

            if (sNum === stepNum) {
                step.classList.add('active');
            } else if (sNum < stepNum) {
                step.classList.add('completed');
            }
        });
    }

    function updateTabs(stepNum) {
        tabs.forEach((tab, index) => {
            if (index + 1 === stepNum) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });
    }

    function updateButtons(stepNum) {
        if (stepNum === totalSteps) {
            btnNext.innerHTML = 'Submit Registration <i data-feather="check"></i>';
        } else {
            const nextStepName = steps[stepNum].querySelector('.step-title').textContent;
            btnNext.innerHTML = `Next: ${nextStepName} <i data-feather="chevron-right"></i>`;
        }
        feather.replace();
    }

    function prefillChildDetails(childData) {
        // Prefill Inputs
        if (inputDancerFirst) inputDancerFirst.value = childData.Dancer_First_Name || "";
        if (inputDancerLast) inputDancerLast.value = childData.Dancer_Last_Name || "";
        if (inputDancerRoom) inputDancerRoom.value = childData.Default_Room || "";
        if (inputDancerClass) inputDancerClass.value = childData.Class_Group || "";
        if (document.getElementById('dancer-routine-group')) document.getElementById('dancer-routine-group').value = childData.Routine_Group || "";

        if (inputParentName) inputParentName.value = childData.Parent_Guardian_Name || "";
        if (document.getElementById('parent-email')) document.getElementById('parent-email').value = childData.Parent_Guardian_Email || "";
        if (document.getElementById('parent-phone')) document.getElementById('parent-phone').value = childData.Parent_Guardian_Phone || "";

        if (document.getElementById('backup-name')) document.getElementById('backup-name').value = childData.Backup_Emergency_Contact_Name || "";
        if (document.getElementById('backup-phone')) document.getElementById('backup-phone').value = childData.Backup_Emergency_Contact_Phone || "";

        if (document.getElementById('pickup-name')) document.getElementById('pickup-name').value = childData.Designated_Pickup_Drop_O_Person_Name || "";
        if (document.getElementById('pickup-phone')) document.getElementById('pickup-phone').value = childData.Designated_Pickup_Drop_O_Person_Phone || "";

        if (childData.Medical_Alert === "Yes" || childData.Medical_Alert === true || childData.Medical_Alert === "true") {
            const yesRadio = document.querySelector('input[name="medical_alert"][value="Yes"]');
            if (yesRadio) yesRadio.checked = true;
        } else {
            const noRadio = document.querySelector('input[name="medical_alert"][value="No"]');
            if (noRadio) noRadio.checked = true;
        }
        if (document.getElementById('medical-details')) document.getElementById('medical-details').value = childData.Medical_Details_Description || "";

        // Helper to extract URL if Creator returns an <img> tag
        function extractImageUrl(imageStr) {
            if (!imageStr) return "";
            if (imageStr.includes('<img')) {
                const match = imageStr.match(/src\s*=\s*"([^"]+)"/i) || imageStr.match(/src\s*=\s*'([^']+)'/i);
                return match ? match[1] : "";
            }
            return imageStr;
        }

        function setExistingPhotoUI(previewContainer, imgElement, photoData) {
            let existingText = previewContainer.querySelector('.existing-photo-text');
            if (!existingText) {
                existingText = document.createElement('div');
                existingText.className = 'existing-photo-text';
                existingText.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom:8px;"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg><br><span style="font-size:0.85rem;font-weight:600;">Photo on File</span>';
                existingText.style.textAlign = 'center';
                existingText.style.color = 'var(--primary-color)';
                previewContainer.insertBefore(existingText, previewContainer.firstChild);
            }
            
            const url = extractImageUrl(photoData);
            
            // Default to showing the image
            existingText.style.display = 'none';
            imgElement.style.display = 'block';
            
            // If the image fails to load (e.g. private Zoho URL without session), fallback to the placeholder
            imgElement.onerror = function() {
                imgElement.style.display = 'none';
                existingText.style.display = 'block';
            };
            
            imgElement.src = url;
            previewContainer.style.display = 'flex';
        }

        // Prefill Images if they exist
        const dancerImgBox = document.querySelector('.dancer-photo-input').closest('.file-upload-box').querySelector('.image-preview');
        const dancerPreviewContainer = dancerImgBox.closest('.image-preview-container');
        const dancerPhotoData = childData.Dancer_img || childData.Dancer_Photo;
        if (dancerPhotoData && dancerPhotoData.trim() !== "") {
            setExistingPhotoUI(dancerPreviewContainer, dancerImgBox, dancerPhotoData);
        } else {
            dancerPreviewContainer.style.display = 'none';
        }

        const pickupImgBox = document.querySelector('.pickup-photo-input').closest('.file-upload-box').querySelector('.image-preview');
        const pickupPreviewContainer = pickupImgBox.closest('.image-preview-container');
        const pickupPhotoData = childData.Pickup_img || childData.Designated_Pickup_Drop_O_Person_Photo;
        if (pickupPhotoData && pickupPhotoData.trim() !== "") {
            setExistingPhotoUI(pickupPreviewContainer, pickupImgBox, pickupPhotoData);
        } else {
            pickupPreviewContainer.style.display = 'none';
        }

        // Generate Event Days UI
        const eventDaysList = document.getElementById('event-days-list');
        const eventInfoContainer = document.getElementById('event-info-container');
        eventDaysList.innerHTML = '';
        if (childData.Daily_Attendance && childData.Daily_Attendance.length > 0) {
            // Sort attendance days to get start and end dates accurately
            const sortedDays = [...childData.Daily_Attendance].sort((a, b) => new Date(a.Event_Date) - new Date(b.Event_Date));
            const eventName = sortedDays[0].Event_Name || 'Recital Event';
            const startDate = sortedDays[0].Event_Date;
            const endDate = sortedDays[sortedDays.length - 1].Event_Date;

            if (eventInfoContainer) {
                eventInfoContainer.style.display = 'block';
                eventInfoContainer.innerHTML = `
                    <div style="font-weight: 700; font-size: 1.1rem; color: var(--text-main); margin-bottom: 4px;">${eventName}</div>
                    <div style="font-size: 0.9rem; color: var(--text-muted);">
                        <i data-feather="calendar" style="width: 14px; height: 14px; vertical-align: middle; margin-right: 4px;"></i>
                        ${startDate} ${startDate !== endDate ? ` to ${endDate}` : ''}
                    </div>
                `;
            }

            childData.Daily_Attendance.forEach(day => {
                const label = document.createElement('label');
                label.className = 'radio-label';
                label.style.marginBottom = '8px';
                label.innerHTML = `
                    <input type="checkbox" name="absent_days" value="${day.ID}" style="display:none;">
                    <span class="custom-checkbox" style="display:inline-flex; align-items:center; justify-content:center; width:20px; height:20px; border:1px solid var(--border-primary); margin-right:8px; border-radius:4px; position:relative; transition:all 0.2s;"></span> 
                    ${day.Event_Name} - ${day.Event_Date}
                `;
                // Basic CSS styling for pseudo-checkbox logic
                eventDaysList.appendChild(label);
            });
            // Attach listener to pseudo checkboxes to reflect checked state
            const cbs = eventDaysList.querySelectorAll('input[type="checkbox"]');
            cbs.forEach(cb => {
                cb.addEventListener('change', function() {
                    const span = this.nextElementSibling;
                    if(this.checked) {
                        span.style.backgroundColor = 'var(--primary-color)';
                        span.style.borderColor = 'var(--primary-color)';
                        span.innerHTML = '<i data-feather="check" style="color:white; width:14px; height:14px;"></i>';
                        feather.replace();
                    } else {
                        span.style.backgroundColor = 'transparent';
                        span.style.borderColor = 'var(--border-primary)';
                        span.innerHTML = '';
                    }
                });
            });
        } else {
            if (eventInfoContainer) eventInfoContainer.style.display = 'none';
            eventDaysList.innerHTML = '<p style="color: var(--text-muted); font-size: 0.85rem;">No event days available for this dancer.</p>';
        }

        updateSidebar();
    }

    function goToStep(stepNum) {
        if (stepNum >= 1 && stepNum <= totalSteps) {
            
            // Validation before moving to step 3
            if (stepNum === 3 && currentStep === 2) {
                const selectedRadio = document.querySelector('input[name="selected_child"]:checked');
                if (!selectedRadio) {
                    alert('Please select a child to proceed.');
                    return;
                }
                const childId = selectedRadio.value;
                selectedChild = fetchedChildren.find(c => c.ID === childId || c.ID.toString() === childId);
                if (selectedChild) {
                    prefillChildDetails(selectedChild);
                }
            }

            currentStep = stepNum;
            updateStepper(currentStep);
            updateTabs(currentStep);
            updateButtons(currentStep);

            if (currentStep === totalSteps) {
                generateReviewSummary();
            }

            // Scroll to top of form
            document.querySelector('.app-container').scrollIntoView({ behavior: 'smooth' });
        }
    }

    // Next Button Click
    btnNext.addEventListener('click', () => {
        if (currentStep === 1) {
            verifyFeedback.textContent = "Please verify your code first.";
            verifyFeedback.style.color = "var(--danger)";
        } else if (currentStep < totalSteps) {
            goToStep(currentStep + 1);
        } else {
            submitRegistration();
        }
    });

    // Verification Logic (Step 1)
    if (btnVerify) {
        btnVerify.addEventListener('click', () => {
            const code = inputRegCode ? inputRegCode.value.trim() : '';

            if (!code) {
                verifyFeedback.textContent = "Please enter your parent code.";
                verifyFeedback.style.color = "var(--danger)";
                return;
            }

            btnVerify.innerHTML = '<i data-feather="loader" class="spin"></i> Verifying...';
            feather.replace();
            btnVerify.disabled = true;

            API.fetchDancer(code)
                .then(response => {
                    let resultData = response.result;
                    if (typeof resultData === 'string') {
                        try { resultData = JSON.parse(resultData); } catch (e) { }
                    }

                    if (response.code === 3000 && resultData && resultData.status === "success") {
                        verifyFeedback.textContent = "Verified! Fetching children...";
                        verifyFeedback.style.color = "var(--success)";

                        fetchedChildren = resultData.data || [];
                        
                        // Render children list
                        const container = document.getElementById('children-list-container');
                        container.innerHTML = '';

                        if (fetchedChildren.length === 0) {
                            container.innerHTML = '<p style="color:var(--text-muted);">No children found for this code.</p>';
                        } else {
                            fetchedChildren.forEach((child, index) => {
                                const label = document.createElement('label');
                                label.className = 'radio-label';
                                label.style.padding = '16px';
                                label.style.border = '1px solid var(--border-color)';
                                label.style.borderRadius = 'var(--border-radius-sm)';
                                label.style.display = 'flex';
                                label.style.alignItems = 'center';
                                label.style.cursor = 'pointer';
                                label.innerHTML = `
                                    <input type="radio" name="selected_child" value="${child.ID}" ${index === 0 ? 'checked' : ''}>
                                    <span class="radio-custom"></span>
                                    <div style="margin-left: 16px; display: flex; flex-direction: column;">
                                        <span style="font-weight: 600; font-size:1.05rem; color: var(--text-main);">${child.Dancer_Full_Name || child.Dancer_First_Name + ' ' + child.Dancer_Last_Name}</span>
                                        <span style="font-size: 0.85rem; color: var(--text-muted); margin-top:4px;">Room: ${child.Default_Room || '-'} &nbsp;&bull;&nbsp; Class: ${child.Class_Group || '-'}</span>
                                    </div>
                                `;
                                container.appendChild(label);
                            });
                        }

                        setTimeout(() => {
                            goToStep(2);
                            btnVerify.innerHTML = 'Verify & Fetch Details';
                            btnVerify.disabled = false;
                        }, 500);

                    } else {
                        verifyFeedback.textContent = (resultData && resultData.message) ? resultData.message : "Invalid Code.";
                        verifyFeedback.style.color = "var(--danger)";
                        btnVerify.innerHTML = 'Verify & Fetch Details';
                        btnVerify.disabled = false;
                    }
                })
                .catch(err => {
                    console.error("Fetch error:", err);
                    verifyFeedback.textContent = "Network error. Please try again.";
                    verifyFeedback.style.color = "var(--danger)";
                    btnVerify.innerHTML = 'Verify & Fetch Details';
                    btnVerify.disabled = false;
                });
        });
    }

    // Stepper Click
    steps.forEach((step) => {
        step.addEventListener('click', () => {
            const targetStep = parseInt(step.getAttribute('data-step'));
            if (targetStep <= currentStep || step.classList.contains('completed')) {
                goToStep(targetStep);
            }
        });
    });

    // Attendance Toggle
    const attendanceRadios = document.querySelectorAll('input[name="attendance_status"]');
    const absentDaysContainer = document.getElementById('absent-days-container');
    attendanceRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.value === 'Absent Some') {
                absentDaysContainer.style.display = 'block';
            } else {
                absentDaysContainer.style.display = 'none';
                // Uncheck all absent days
                document.querySelectorAll('input[name="absent_days"]').forEach(cb => {
                    cb.checked = false;
                    const span = cb.nextElementSibling;
                    if(span) {
                        span.style.backgroundColor = 'transparent';
                        span.style.borderColor = 'var(--border-primary)';
                        span.innerHTML = '';
                    }
                });
            }
        });
    });

    // --- Desktop Sidebar Live Updates ---
    function updateSidebar() {
        if (!isMobile()) {
            const first = inputDancerFirst ? inputDancerFirst.value.trim() : '';
            const last = inputDancerLast ? inputDancerLast.value.trim() : '';
            if (summaryDancer) summaryDancer.textContent = first || last ? `${first} ${last}` : 'Not selected';
            if (summaryRoom && inputDancerRoom) summaryRoom.textContent = inputDancerRoom.value || 'Not selected';
            if (summaryClass && inputDancerClass) summaryClass.textContent = inputDancerClass.value || '-';
        }
    }

    [inputDancerFirst, inputDancerLast, inputDancerRoom, inputDancerClass].forEach(input => {
        if (input) {
            input.addEventListener('input', updateSidebar);
            input.addEventListener('change', updateSidebar);
        }
    });

    // --- Generate Review Summary (Tab 5) ---
    function generateReviewSummary() {
        const reviewContainer = document.getElementById('review-container');
        if (!reviewContainer) return;

        const dancerFirst = inputDancerFirst ? inputDancerFirst.value : 'N/A';
        const dancerLast = inputDancerLast ? inputDancerLast.value : '';
        const parentName = inputParentName ? inputParentName.value : 'N/A';
        const room = inputDancerRoom ? inputDancerRoom.value : 'N/A';
        
        let attendanceText = "Present on all event days";
        const isAbsent = document.querySelector('input[name="attendance_status"]:checked').value === "Absent Some";
        if (isAbsent) {
            const absentIds = Array.from(document.querySelectorAll('input[name="absent_days"]:checked')).map(cb => cb.value);
            attendanceText = absentIds.length > 0 ? `Will be absent on ${absentIds.length} event day(s)` : "Present on all event days";
        }

        reviewContainer.innerHTML = `
            <div style="background: var(--bg-light); padding: 20px; border-radius: 8px; margin-bottom: 20px; color: var(--text-main);">
                <p style="margin-bottom: 8px;"><strong>Dancer:</strong> ${dancerFirst} ${dancerLast}</p>
                <p style="margin-bottom: 8px;"><strong>Guardian:</strong> ${parentName}</p>
                <p style="margin-bottom: 8px;"><strong>Room ID:</strong> ${room}</p>
                <p style="margin-bottom: 0;"><strong>Attendance:</strong> ${attendanceText}</p>
            </div>
            <p style="color: var(--text-main);">If everything looks correct, click the submit button below.</p>
        `;
    }

    // --- Submit Function ---
    function submitRegistration() {
        btnNext.innerHTML = '<i data-feather="loader" class="spin"></i> Submitting...';
        feather.replace();
        btnNext.disabled = true;

        const absentIDs = Array.from(document.querySelectorAll('input[name="absent_days"]:checked')).map(cb => cb.value);

        // Collect all data mapping exactly to Zoho Creator field names
        const payload = {
            "Parent_Registration_Code": inputRegCode ? inputRegCode.value : '',
            "Dancer_ID": selectedChild ? selectedChild.ID : '',
            "Dancer_First_Name": inputDancerFirst ? inputDancerFirst.value : '',
            "Dancer_Last_Name": inputDancerLast ? inputDancerLast.value : '',
            "Dancer_Full_Name": `${inputDancerFirst ? inputDancerFirst.value : ''} ${inputDancerLast ? inputDancerLast.value : ''}`.trim(),
            "Default_Room": inputDancerRoom ? inputDancerRoom.value : '',
            "Class_Group": inputDancerClass ? inputDancerClass.value : '',
            "Routine_Group": document.getElementById('dancer-routine-group') ? document.getElementById('dancer-routine-group').value : '',

            "Parent_Guardian_Name": inputParentName ? inputParentName.value : '',
            "Parent_Guardian_Phone": document.getElementById('parent-phone') ? document.getElementById('parent-phone').value : '',
            "Parent_Guardian_Email": document.getElementById('parent-email') ? document.getElementById('parent-email').value : '',

            "Backup_Emergency_Contact_Name": document.getElementById('backup-name') ? document.getElementById('backup-name').value : '',
            "Backup_Emergency_Contact_Phone": document.getElementById('backup-phone') ? document.getElementById('backup-phone').value : '',

            "Designated_Pickup_Drop_O_Person_Name": document.getElementById('pickup-name') ? document.getElementById('pickup-name').value : '',
            "Designated_Pickup_Drop_O_Person_Phone": document.getElementById('pickup-phone') ? document.getElementById('pickup-phone').value : '',

            "Medical_Alert": document.querySelector('input[name="medical_alert"]:checked') ? document.querySelector('input[name="medical_alert"]:checked').value : 'No',
            "Medical_Details_Description": document.getElementById('medical-details') ? document.getElementById('medical-details').value : '',

            "Dancer_Photo_Base64": base64Images.dancerPhoto,
            "Pickup_Photo_Base64": base64Images.pickupPhoto,

            "Absent_Attendance_IDs": absentIDs
        };

        console.log('Submitting Payload matching Creator Fields:', payload);

        API.submitRegistration(payload)
            .then(response => {
                let resultData = response.result;
                if (typeof resultData === 'string') {
                    try { resultData = JSON.parse(resultData); } catch (e) { }
                }

                if (response.code === 3000 && resultData && resultData.status === "success") {
                    alert('Registration Submitted Successfully to Master Dancer Roster!');
                    window.location.reload();
                } else {
                    alert('Error submitting: ' + ((resultData && resultData.message) ? resultData.message : 'Unknown error'));
                    btnNext.innerHTML = 'Submit Registration <i data-feather="check"></i>';
                    feather.replace();
                    btnNext.disabled = false;
                }
            })
            .catch(err => {
                console.error("Submit error:", err);
                alert('Network error submitting registration. Please try again.');
                btnNext.innerHTML = 'Submit Registration <i data-feather="check"></i>';
                feather.replace();
                btnNext.disabled = false;
            });
    }

    // --- File Upload UI Feedback & Preview ---
    const fileInputs = document.querySelectorAll('.file-input');
    fileInputs.forEach(input => {
        input.addEventListener('change', function () {
            if (this.files && this.files.length > 0) {
                const file = this.files[0];
                const uploadBox = this.closest('.file-upload-box');
                const previewContainer = uploadBox.querySelector('.image-preview-container');
                const previewImage = uploadBox.querySelector('.image-preview');

                const reader = new FileReader();
                reader.onload = function (e) {
                    const base64String = e.target.result;
                    previewImage.src = base64String;
                    previewImage.style.display = 'block';
                    
                    const existingText = previewContainer.querySelector('.existing-photo-text');
                    if (existingText) existingText.style.display = 'none';
                    
                    previewContainer.style.display = 'flex';

                    // Store base64 based on the specific input class
                    if (input.classList.contains('dancer-photo-input')) {
                        base64Images.dancerPhoto = base64String;
                    } else if (input.classList.contains('pickup-photo-input')) {
                        base64Images.pickupPhoto = base64String;
                    }
                };
                reader.readAsDataURL(file);
            }
        });
    });

    // Handle Remove Image
    const removeButtons = document.querySelectorAll('.btn-remove-image');
    removeButtons.forEach(btn => {
        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            e.preventDefault();

            const uploadBox = this.closest('.file-upload-box');
            const fileInput = uploadBox.querySelector('.file-input');
            const previewContainer = uploadBox.querySelector('.image-preview-container');
            const previewImage = uploadBox.querySelector('.image-preview');

            fileInput.value = '';
            previewImage.src = '';
            previewContainer.style.display = 'none';

            // Clear base64
            if (fileInput.classList.contains('dancer-photo-input')) {
                base64Images.dancerPhoto = '';
            } else if (fileInput.classList.contains('pickup-photo-input')) {
                base64Images.pickupPhoto = '';
            }
        });
    });

    // Register Another Dancer Button
    if (btnAddAnother) {
        btnAddAnother.addEventListener('click', () => {
            window.location.reload();
        });
    }

    // Initialize first step
    goToStep(1);
    updateSidebar();

});
