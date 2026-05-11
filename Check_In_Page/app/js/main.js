document.addEventListener('DOMContentLoaded', () => {
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

    // QR Scanner Logic
    const qrBtn = document.getElementById('open-qr-scanner');
    const closeQrBtn = document.getElementById('close-qr-scanner');
    const qrModal = document.getElementById('qr-modal');
    let html5QrcodeScanner = null;

    if (qrBtn && qrModal) {
        qrBtn.addEventListener('click', () => {
            qrModal.style.display = 'flex';
            
            // Initialize scanner if not already done
            if (!html5QrcodeScanner && typeof Html5QrcodeScanner !== 'undefined') {
                html5QrcodeScanner = new Html5QrcodeScanner(
                    "qr-reader", 
                    { fps: 10, qrbox: { width: 250, height: 250 } },
                    /* verbose= */ false
                );
                
                html5QrcodeScanner.render(onScanSuccess, onScanFailure);
            }
        });

        closeQrBtn.addEventListener('click', () => {
            qrModal.style.display = 'none';
            // Optionally stop the scanner when closed to save battery
            if (html5QrcodeScanner) {
                html5QrcodeScanner.clear().catch(error => {
                    console.error("Failed to clear html5QrcodeScanner. ", error);
                });
                html5QrcodeScanner = null;
            }
        });
    }

    function onScanSuccess(decodedText, decodedResult) {
        // Handle the scanned code as you like, for example:
        console.log(`Code matched = ${decodedText}`, decodedResult);
        
        // Add your Zoho check-in logic here
        // Example: ZOHO.CREATOR.API.addRecord(...)
        
        // Close modal after successful scan
        if (qrModal) {
            qrModal.style.display = 'none';
        }
        if (html5QrcodeScanner) {
            html5QrcodeScanner.clear();
            html5QrcodeScanner = null;
        }
        
        alert(`Successfully scanned dancer ID: ${decodedText}`);
    }

    function onScanFailure(error) {
        // handle scan failure, usually better to ignore and keep scanning.
        // console.warn(`Code scan error = ${error}`);
    }
});
