document.addEventListener('DOMContentLoaded', () => {
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

    // Camera Upload Logic
    const photoBox = document.getElementById('photo-box');
    const cameraInput = document.getElementById('camera-input');
    const photoPreview = document.getElementById('photo-preview');

    if (photoBox && cameraInput) {
        photoBox.addEventListener('click', () => {
            cameraInput.click();
        });

        cameraInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    photoPreview.src = e.target.result;
                    photoPreview.style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Notes Character Counter
    const notesInput = document.getElementById('notes-input');
    const charCount = document.getElementById('char-count');
    
    if (notesInput && charCount) {
        notesInput.addEventListener('input', (e) => {
            const length = e.target.value.length;
            charCount.textContent = `${length}/250`;
        });
    }
    
    // Checkout Button Click Handler (mockup)
    const checkoutBtn = document.querySelector('.checkout-btn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', () => {
            // Check if photo is required based on your business logic
            // Assuming required for demo
            if (photoPreview && photoPreview.style.display === 'block') {
                alert("Checkout successful!");
            } else {
                alert("Please capture a pickup photo to proceed.");
            }
        });
    }
});
