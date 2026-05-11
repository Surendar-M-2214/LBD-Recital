document.addEventListener('DOMContentLoaded', () => {
    // --- State & Elements ---
    let currentStep = 1;
    const totalSteps = 6;

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
    const inputVerifyLast = document.getElementById('verify-last-name');
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

    function goToStep(stepNum) {
        if (stepNum >= 1 && stepNum <= totalSteps) {
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
            // Force verify step to use the verify button instead of next
            // Or just alert if they click next without verifying
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
            const lastName = inputVerifyLast ? inputVerifyLast.value.trim() : '';

            if (!code || !lastName) {
                verifyFeedback.textContent = "Please enter both fields.";
                verifyFeedback.style.color = "var(--danger)";
                return;
            }

            btnVerify.innerHTML = '<i data-feather="loader" class="spin"></i> Verifying...';
            feather.replace();
            btnVerify.disabled = true;

            // Use our custom local Node.js proxy to strip the Origin header that Zoho rejects
            const isLocal = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
            const fetchUrl = `https://www.zohoapis.ca/creator/custom/dean_ca/fetch_dancer_details?publickey=y54WKSexXFZv561bwQ0uTmXVa&parentCode=${encodeURIComponent(code)}&lastName=${encodeURIComponent(lastName)}`;

            const finalUrl = isLocal ? `http://localhost:3001/?url=${encodeURIComponent(fetchUrl)}` : fetchUrl;

            fetch(finalUrl)
                .then(res => res.json())
                .then(response => {
                    let resultData = response.result;
                    if (typeof resultData === 'string') {
                        try { resultData = JSON.parse(resultData); } catch (e) { }
                    }

                    if (response.code === 3000 && resultData && resultData.status === "success") {
                        verifyFeedback.textContent = "Verified! Prefilling details...";
                        verifyFeedback.style.color = "var(--success)";

                        const fetchedData = resultData.data || {};

                        // Prefill Inputs
                        if (inputDancerFirst) inputDancerFirst.value = fetchedData.Dancer_First_Name || "";
                        if (inputDancerLast) inputDancerLast.value = fetchedData.Dancer_Last_Name || "";
                        if (inputDancerRoom) inputDancerRoom.value = fetchedData.Default_Room || "";
                        if (inputDancerClass) inputDancerClass.value = fetchedData.Class_Group || "";
                        if (document.getElementById('dancer-routine-group')) document.getElementById('dancer-routine-group').value = fetchedData.Routine_Group || "";

                        if (inputParentName) inputParentName.value = fetchedData.Parent_Guardian_Name || "";
                        if (document.getElementById('parent-email')) document.getElementById('parent-email').value = fetchedData.Parent_Guardian_Email || "";
                        if (document.getElementById('parent-phone')) document.getElementById('parent-phone').value = fetchedData.Parent_Guardian_Phone || "";

                        if (document.getElementById('backup-name')) document.getElementById('backup-name').value = fetchedData.Backup_Emergency_Contact_Name || "";
                        if (document.getElementById('backup-phone')) document.getElementById('backup-phone').value = fetchedData.Backup_Emergency_Contact_Phone || "";

                        if (document.getElementById('pickup-name')) document.getElementById('pickup-name').value = fetchedData.Designated_Pickup_Drop_O_Person_Name || "";
                        if (document.getElementById('pickup-phone')) document.getElementById('pickup-phone').value = fetchedData.Designated_Pickup_Drop_O_Person_Phone || "";

                        if (fetchedData.Medical_Alert === "Yes" || fetchedData.Medical_Alert === true || fetchedData.Medical_Alert === "true") {
                            const yesRadio = document.querySelector('input[name="medical_alert"][value="Yes"]');
                            if (yesRadio) yesRadio.checked = true;
                        } else {
                            const noRadio = document.querySelector('input[name="medical_alert"][value="No"]');
                            if (noRadio) noRadio.checked = true;
                        }
                        if (document.getElementById('medical-details')) document.getElementById('medical-details').value = fetchedData.Medical_Details_Description || "";

                        // Prefill Images if they exist
                        if (fetchedData.Dancer_Photo && fetchedData.Dancer_Photo.trim() !== "") {
                            const imgBox = document.querySelector('#tab-2 .image-preview');
                            if (imgBox) {
                                imgBox.src = fetchedData.Dancer_Photo;
                                imgBox.closest('.image-preview-container').style.display = 'flex';
                            }
                        }
                        if (fetchedData.Designated_Pickup_Drop_O_Person_Photo && fetchedData.Designated_Pickup_Drop_O_Person_Photo.trim() !== "") {
                            const imgBox = document.querySelector('#tab-4 .image-preview');
                            if (imgBox) {
                                imgBox.src = fetchedData.Designated_Pickup_Drop_O_Person_Photo;
                                imgBox.closest('.image-preview-container').style.display = 'flex';
                            }
                        }

                        updateSidebar();

                        setTimeout(() => {
                            goToStep(2);
                            btnVerify.innerHTML = 'Verify & Fetch Details';
                            btnVerify.disabled = false;
                        }, 500);

                    } else {
                        verifyFeedback.textContent = (resultData && resultData.message) ? resultData.message : "Invalid Code or Last Name.";
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

        reviewContainer.innerHTML = `
            <div style="background: var(--bg-light); padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <p><strong>Dancer:</strong> ${dancerFirst} ${dancerLast}</p>
                <p><strong>Guardian:</strong> ${parentName}</p>
                <p><strong>Room ID:</strong> ${room}</p>
            </div>
            <p>If everything looks correct, click the submit button below.</p>
        `;
    }

    // --- Submit Function ---
    function submitRegistration() {
        btnNext.innerHTML = '<i data-feather="loader" class="spin"></i> Submitting...';
        feather.replace();
        btnNext.disabled = true;

        // Collect all data mapping exactly to Zoho Creator field names
        const payload = {
            "Parent_Registration_Code": inputRegCode ? inputRegCode.value : '',
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
            "Pickup_Photo_Base64": base64Images.pickupPhoto
        };

        console.log('Submitting Payload matching Creator Fields:', payload);

        // Submit API Call
        const isLocal = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
        const submitUrl = 'https://www.zohoapis.ca/creator/custom/dean_ca/submit_parent_registration?publickey=BJgxx2dUj0wYfOffS4XG4kU67';

        const finalUrl = isLocal ? `http://localhost:3001/?url=${encodeURIComponent(submitUrl)}` : submitUrl;

        fetch(finalUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                payload: JSON.stringify(payload)
            })
        })
            .then(res => res.json())
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
                    previewContainer.style.display = 'flex';

                    // Store base64 based on the tab/input context
                    if (uploadBox.closest('#tab-2')) { // Tab 2 is now Dancer Information
                        base64Images.dancerPhoto = base64String;
                    } else if (uploadBox.closest('#tab-4')) { // Tab 4 is now Pickup Person
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
            if (uploadBox.closest('#tab-2')) {
                base64Images.dancerPhoto = '';
            } else if (uploadBox.closest('#tab-4')) {
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
