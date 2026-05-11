document.addEventListener('DOMContentLoaded', () => {
    // --- State & Elements ---
    let currentStep = 1;
    const totalSteps = 5;

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
        if (currentStep < totalSteps) {
            goToStep(currentStep + 1);
        } else {
            submitRegistration();
        }
    });

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
            "Dancer_First_Name": inputDancerFirst ? inputDancerFirst.value : '',
            "Dancer_Last_Name": inputDancerLast ? inputDancerLast.value : '',
            "Dancer_Full_Name": `${inputDancerFirst ? inputDancerFirst.value : ''} ${inputDancerLast ? inputDancerLast.value : ''}`.trim(),
            "Default_Room_ID": inputDancerRoom ? inputDancerRoom.value : '',
            "Class_Group": inputDancerClass ? inputDancerClass.value : '',
            "Routine_Group": document.getElementById('dancer-routine-group') ? document.getElementById('dancer-routine-group').value : '',
            
            "Parent_Guardian_Name": inputParentName ? inputParentName.value : '',
            "Parent_Guardian_Phone": document.getElementById('parent-phone') ? document.getElementById('parent-phone').value : '',
            "Parent_Guardian_Email": document.getElementById('parent-email') ? document.getElementById('parent-email').value : '',
            
            "Backup_Emergency_Contact_Name": document.getElementById('backup-name') ? document.getElementById('backup-name').value : '',
            "Backup_Emergency_Contact_Phone": document.getElementById('backup-phone') ? document.getElementById('backup-phone').value : '',
            
            "Designated_Pickup_Drop_Off_Person_Name": document.getElementById('pickup-name') ? document.getElementById('pickup-name').value : '',
            "Designated_Pickup_Drop_Off_Person_Phone": document.getElementById('pickup-phone') ? document.getElementById('pickup-phone').value : '',
            
            "Medical_Alert": document.querySelector('input[name="medical_alert"]:checked') ? document.querySelector('input[name="medical_alert"]:checked').value === "Yes" : false,
            "Medical_Details": document.getElementById('medical-details') ? document.getElementById('medical-details').value : ''
        };

        console.log('Submitting Payload matching Creator Fields:', payload);
        
        // Simulating API Call
        setTimeout(() => {
            alert('Registration Submitted Successfully to Master Dancer Roster!');
            window.location.reload();
        }, 1500);
    }

    // --- File Upload UI Feedback & Preview ---
    const fileInputs = document.querySelectorAll('.file-input');
    fileInputs.forEach(input => {
        input.addEventListener('change', function() {
            if (this.files && this.files.length > 0) {
                const file = this.files[0];
                const uploadBox = this.closest('.file-upload-box');
                const previewContainer = uploadBox.querySelector('.image-preview-container');
                const previewImage = uploadBox.querySelector('.image-preview');
                
                const reader = new FileReader();
                reader.onload = function(e) {
                    previewImage.src = e.target.result;
                    previewContainer.style.display = 'flex';
                };
                reader.readAsDataURL(file);
            }
        });
    });

    // Handle Remove Image
    const removeButtons = document.querySelectorAll('.btn-remove-image');
    removeButtons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation(); 
            e.preventDefault();
            
            const uploadBox = this.closest('.file-upload-box');
            const fileInput = uploadBox.querySelector('.file-input');
            const previewContainer = uploadBox.querySelector('.image-preview-container');
            const previewImage = uploadBox.querySelector('.image-preview');
            
            fileInput.value = '';
            previewImage.src = '';
            previewContainer.style.display = 'none';
        });
    });

    // Initialize first step
    goToStep(1);
    updateSidebar();
    
});
