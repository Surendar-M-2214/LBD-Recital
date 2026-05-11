document.addEventListener('DOMContentLoaded', () => {
    // State & Dummy Data
    let dancers = [
        {
            id: "D1", name: "Ava Thompson", room: "Room B", status: "Checked In",
            photo: "https://i.pravatar.cc/300?img=5",
            defaultPickup: { name: "Michael Thompson", phone: "(555) 123-4567" },
            changeOrder: { name: "Jessica Miller", phone: "(555) 867-5309", date: "May 18" },
            medical: []
        },
        {
            id: "D2", name: "Chloe Williams", room: "Room A", status: "Not Checked In",
            photo: "https://i.pravatar.cc/300?img=1",
            defaultPickup: { name: "Sarah Williams", phone: "(555) 234-5678" },
            changeOrder: null,
            medical: ["Peanut Allergy", "Asthma"]
        },
        {
            id: "D3", name: "Mia Johnson", room: "Room C", status: "Checked Out",
            photo: "https://i.pravatar.cc/300?img=9",
            defaultPickup: { name: "David Johnson", phone: "(555) 345-6789" },
            changeOrder: null,
            medical: []
        },
        {
            id: "D4", name: "Liam Smith", room: "Room A", status: "Checked In",
            photo: "https://i.pravatar.cc/300?img=11",
            defaultPickup: { name: "John Smith", phone: "(555) 987-6543" },
            changeOrder: null,
            medical: []
        }
    ];

    let appState = {
        mode: null, // 'checkin' or 'checkout'
        selectedDancer: null,
        photoCaptured: false,
        currentView: null
    };

    let html5QrCode = null;

    const appContainer = document.getElementById('app-container');
    const templates = {
        'scan-home': document.getElementById('view-scan-home').innerHTML,
        'scanner': document.getElementById('view-scanner').innerHTML,
        'dancer-detail': document.getElementById('view-dancer-detail').innerHTML,
        'admin-dashboard': document.getElementById('view-admin-dashboard').innerHTML,
    };

    // Router
    function navigateTo(viewName) {
        if (!templates[viewName]) return;
        appContainer.innerHTML = templates[viewName];
        attachEventListeners(viewName);
        renderDataForView(viewName);
    }

    function updateDancerStatus(id, newStatus) {
        const dancer = dancers.find(d => d.id === id);
        if (dancer) dancer.status = newStatus;
    }

    function renderDataForView(viewName) {
        if (viewName === 'scanner') {
            const list = document.getElementById('dummy-dancers-list');
            document.getElementById('scanner-title').textContent = appState.mode === 'checkin' ? "Scan QR to Check In" : "Scan QR to Check Out";
            
            // Initialize HTML5 QR Code Scanner
            html5QrCode = new Html5Qrcode("reader");
            html5QrCode.start(
                { facingMode: "environment" }, // Back camera
                { fps: 10, qrbox: { width: 200, height: 200 } },
                (decodedText, decodedResult) => {
                    // Success Callback
                    html5QrCode.stop().then(() => {
                        let found = dancers.find(d => d.id === decodedText || d.name.toLowerCase() === decodedText.toLowerCase());
                        if (!found) {
                            alert(`Scanned: ${decodedText}. Not in dummy data, using fallback for demo.`);
                            found = dancers[0];
                        }
                        appState.selectedDancer = found;
                        appState.photoCaptured = false;
                        navigateTo('dancer-detail');
                    }).catch(err => console.log(err));
                },
                (errorMessage) => { /* ignore frame errors */ }
            ).then(() => {
                const icon = document.getElementById('camera-placeholder-icon');
                if(icon) icon.style.display = 'none';
            }).catch((err) => {
                console.error("Camera error:", err);
                const icon = document.getElementById('camera-placeholder-icon');
                if(icon) icon.className = "ph ph-warning-circle text-red";
            });

            // Keep the manual fallback list
            list.innerHTML = '';
            dancers.forEach(d => {
                const btn = document.createElement('button');
                btn.className = 'btn-outline w-100';
                btn.style.justifyContent = 'space-between';
                btn.innerHTML = `<span>${d.name}</span> <span class="text-sm text-gray">${d.status}</span>`;
                btn.onclick = () => {
                    appState.selectedDancer = d;
                    appState.photoCaptured = false; // reset
                    navigateTo('dancer-detail');
                };
                list.appendChild(btn);
            });
        }

        if (viewName === 'dancer-detail') {
            const dancer = appState.selectedDancer;
            
            // Header Info
            document.getElementById('detail-title').textContent = appState.mode === 'checkin' ? "Check In" : "Check Out";
            document.getElementById('detail-subtitle').textContent = "Please review information before proceeding.";
            document.getElementById('detail-name').textContent = dancer.name;
            document.getElementById('detail-room').textContent = dancer.room;
            document.getElementById('detail-img').style.backgroundImage = `url(${dancer.photo})`;

            // Status Badge
            const badge = document.getElementById('detail-status-badge');
            const statusText = document.getElementById('detail-status-text');
            badge.className = 'status-badge w-auto mt-1';
            if (dancer.status === 'Checked In') badge.classList.add('badge-green');
            if (dancer.status === 'Not Checked In') badge.classList.add('badge-red');
            if (dancer.status === 'Checked Out') badge.classList.add('badge-purple');
            statusText.textContent = dancer.status;

            // Medical
            if (dancer.medical.length > 0) {
                document.getElementById('medical-alert-box').style.display = 'block';
                document.getElementById('medical-alert-text').textContent = dancer.medical.join(", ");
            }

            // Pickup Info (Only relevant for checkout, but good to show)
            document.getElementById('default-name').textContent = dancer.defaultPickup.name;
            document.getElementById('default-phone').textContent = dancer.defaultPickup.phone;
            
            if (dancer.changeOrder) {
                document.getElementById('change-order-container').style.display = 'block';
                document.getElementById('co-name').textContent = dancer.changeOrder.name;
                document.getElementById('co-phone').textContent = dancer.changeOrder.phone;
            }

            // Action Button Setup
            const actionBtn = document.getElementById('btn-final-action');
            if (appState.mode === 'checkin') {
                actionBtn.innerHTML = `Check In <i class="ph ph-sign-in"></i>`;
                if (dancer.status === 'Checked In' || dancer.status === 'Checked Out') {
                    actionBtn.style.display = 'none';
                    document.getElementById('detail-subtitle').textContent = "This dancer has already been checked in.";
                }
            } else {
                actionBtn.innerHTML = `Check Out <i class="ph ph-sign-out"></i>`;
                if (dancer.status === 'Not Checked In' || dancer.status === 'Checked Out') {
                    actionBtn.style.display = 'none';
                    document.getElementById('detail-subtitle').textContent = "This dancer cannot be checked out.";
                }
            }

            // Photo Capture logic
            const photoBtn = document.getElementById('btn-capture-photo');
            photoBtn.onclick = () => {
                const icon = document.getElementById('capture-icon');
                icon.className = 'ph ph-spinner-gap ph-spin icon-large text-purple';
                setTimeout(() => {
                    icon.className = 'ph ph-check-circle icon-large text-green';
                    document.getElementById('capture-text').textContent = "Photo Captured!";
                    document.getElementById('capture-text').className = "text-green font-medium";
                    photoBtn.style.borderColor = "var(--green-success)";
                    photoBtn.style.backgroundColor = "var(--green-light)";
                    appState.photoCaptured = true;
                    actionBtn.disabled = false;
                    actionBtn.style.opacity = '1';
                }, 1000);
            };

            // Final Action
            actionBtn.onclick = () => {
                if(!appState.photoCaptured) return;
                actionBtn.innerHTML = '<i class="ph ph-spinner-gap ph-spin"></i> Processing...';
                setTimeout(() => {
                    updateDancerStatus(dancer.id, appState.mode === 'checkin' ? 'Checked In' : 'Checked Out');
                    alert(`Success! ${dancer.name} is ${appState.mode === 'checkin' ? 'checked in' : 'checked out'}.`);
                    navigateTo('scan-home');
                }, 800);
            };
        }

        if (viewName === 'admin-dashboard') {
            // Calculate KPIs
            const expected = dancers.length;
            const notCheckedIn = dancers.filter(d => d.status === 'Not Checked In').length;
            const checkedIn = dancers.filter(d => d.status === 'Checked In').length;
            const checkedOut = dancers.filter(d => d.status === 'Checked Out').length;

            document.getElementById('kpi-expected').textContent = expected;
            document.getElementById('kpi-not').textContent = notCheckedIn;
            document.getElementById('kpi-in').textContent = checkedIn;
            document.getElementById('kpi-out').textContent = checkedOut;

            // Room logic
            const rooms = ['Room A', 'Room B', 'Room C'];
            const roomGrid = document.getElementById('room-grid');
            
            rooms.forEach(r => {
                const roomDancers = dancers.filter(d => d.room === r);
                if(roomDancers.length === 0) return;
                
                const checkedInRoom = roomDancers.filter(d => d.status === 'Checked In').length;
                let badgeClass = 'badge-red', dotClass = 'bg-red', text = 'Not Checked In';
                if (checkedInRoom > 0) { badgeClass = 'badge-green'; dotClass = 'bg-green'; text = 'Checked In'; }
                if (roomDancers.every(d => d.status === 'Checked Out')) { badgeClass = 'badge-purple'; dotClass = 'bg-purple'; text = 'Checked Out'; }

                const letter = r.replace('Room ', '');
                
                const card = document.createElement('div');
                card.className = 'room-summary-card';
                card.innerHTML = `
                    <div class="room-header">
                        <div class="room-letter">${letter}</div>
                        <div class="room-info"><h3>${r}</h3><span>Dancers</span></div>
                        <div class="room-icon"><i class="ph ph-users"></i></div>
                    </div>
                    <div class="room-count">
                        <span class="current text-dark">${checkedInRoom}</span> <span class="total">/ ${roomDancers.length}</span>
                    </div>
                    <div class="status-badge ${badgeClass} mt-3">
                        <div class="dot ${dotClass}"></div> ${text}
                    </div>
                `;
                roomGrid.appendChild(card);
            });
        }
    }

    function attachEventListeners(viewName) {
        document.querySelectorAll('[data-target]').forEach(el => {
            el.addEventListener('click', (e) => {
                navigateTo(e.currentTarget.getAttribute('data-target'));
            });
        });

        document.querySelectorAll('[data-action="start-scan"]').forEach(el => {
            el.addEventListener('click', (e) => {
                appState.mode = e.currentTarget.getAttribute('data-mode');
                navigateTo('scanner');
            });
        });
    }

    // Start App
    navigateTo('scan-home');
});
