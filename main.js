// BACKEND API BASE CONFIG
const API_URL = '/api';

// SIDEBAR ACTIONS
function openNav() { document.getElementById("mySidebar").style.width = "250px"; }
function closeNav() { document.getElementById("mySidebar").style.width = "0"; }

function isLoggedIn() {
    return !!localStorage.getItem('authToken');
}

// Persist UI session on page load
window.addEventListener('DOMContentLoaded', () => {
    const activeUser = localStorage.getItem('activeUserName');
    if (isLoggedIn() && activeUser) {
        document.getElementById('navAuthSection').innerHTML = `
            <span style="font-weight:bold; color:#333; margin-right:10px;">Hi, ${activeUser}</span>
            <button class="btn-login" onclick="logoutUser()">Logout</button>
        `;
    }
});

function logoutUser() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('activeUserName');
    alert('Logged out successfully.');
    location.reload();
}

// Booking submission handler
const bookingForm = document.getElementById('bookingForm');
if(bookingForm) {
    bookingForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formMsg = document.getElementById('formMessage');
        
        if (!isLoggedIn()) {
            formMsg.textContent = "Please login to book an event.";
            formMsg.style.color = "red";
            window.location.href = '/login';
            return;
        }

        const formData = {
            name: bookingForm.querySelector('[name="name"]').value,
            email: bookingForm.querySelector('[name="email"]').value,
            eventType: bookingForm.querySelector('[name="eventType"]').value,
            eventDate: bookingForm.querySelector('[name="eventDate"]').value,
            guests: bookingForm.querySelector('[name="guests"]').value,
            message: bookingForm.querySelector('[name="message"]').value
        };

        try {
            const response = await fetch(`${API_URL}/bookings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                formMsg.textContent = "Thank you! Your booking has been recorded.";
                formMsg.style.color = "green";
                bookingForm.reset();
            } else {
                formMsg.textContent = "Failed to submit booking details.";
                formMsg.style.color = "red";
            }
        } catch (err) {
            console.error(err);
            formMsg.textContent = "Server offline. Could not complete booking.";
            formMsg.style.color = "red";
        }
    });
}

// Budget Calculator
const calculateBtn = document.querySelector('.calculator button');
if (calculateBtn) {
    calculateBtn.addEventListener('click', () => {
        const guests = parseInt(document.querySelector('.calculator input[placeholder="Number of Guests"]').value, 10);
        if (isNaN(guests) || guests <= 0) {
            alert('Please enter a valid number of guests.');
            return;
        }
        alert(`Estimated cost: ₹${(guests * 1200).toLocaleString()}`);
    });
}

// Auto-scroll triggers
document.querySelectorAll('button').forEach(button => {
    if (button.textContent.toLowerCase().includes('book us for')) {
        button.addEventListener('click', () => {
            if (isLoggedIn()) {
                document.getElementById('booking').scrollIntoView({behavior: 'smooth'});
            } else {
                window.location.href = '/login';
            }
        });
    }
});

// Checkout gateway protection
const checkoutButton = document.getElementById('checkout-button');
if (checkoutButton) {
    checkoutButton.addEventListener('click', (e) => {
        if (!isLoggedIn()) {
            e.preventDefault();
            alert('Please login to continue with payment.');
            window.location.href = '/login';
        }
    });
}

// --- DYNAMIC LIVE REVIEWS PIPELINE ---
const reviewsContainer = document.getElementById('reviewsContainer');
const reviewForm = document.getElementById('reviewForm');

// 1. Establish real-time live synchronization link with your active port server
const socket = io();

// Helper function to dynamically generate a clean review card block element with cross action deletion toggle
function renderReviewCard(review) {
    return `
        <div class="card review" id="review-${review._id}" style="position: relative;">
            <button onclick="deleteReview('${review._id}')" style="position: absolute; top: 10px; right: 10px; background: none; border: none; color: #ff4757; font-size: 16px; cursor: pointer; font-weight: bold;">✕</button>
            
            <img src="${review.avatar}" alt="${review.name}">
            <h3>${review.name}</h3>
            <p>"${review.message}"</p>
        </div>
    `;
}

// 2. Fetch all existing active comments when the page first boots up
async function loadExistingReviews() {
    try {
        const response = await fetch(`${API_URL}/reviews`);
        const reviews = await response.json();
        
        if (reviews.length === 0) {
            reviewsContainer.innerHTML = `<p style="text-align: center; color: #666; width: 100%;">Be the first to share an experience!</p>`;
            return;
        }

        // Map database list items into structural card layout html elements
        reviewsContainer.innerHTML = reviews.map(review => renderReviewCard(review)).join('');
    } catch (err) {
        console.error('Failure retrieving feedback database array stream:', err);
        reviewsContainer.innerHTML = `<p style="text-align: center; color: red; width: 100%;">Failed to synchronize live review pipeline elements.</p>`;
    }
}

// Boot initial collection check data array on initialization lifecycle hook
window.addEventListener('DOMContentLoaded', loadExistingReviews);

// 3. Review Submission handling with Image Upload pipeline
if (reviewForm) {
    reviewForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!isLoggedIn()) {
            alert('Please sign in or create an account to post real-time updates.');
            window.location.href = '/login';
            return;
        }

        const name = document.getElementById('reviewName').value;
        const message = document.getElementById('reviewMessage').value;
        const avatarFile = document.getElementById('reviewAvatar').files[0];

        // Prepare multipart form object data wrapper
        const formData = new FormData();
        formData.append('name', name);
        formData.append('message', message);
        
        // Only append the file if the user actually chose one
        if (avatarFile) {
            formData.append('avatar', avatarFile);
        }

        try {
            // Note: When sending FormData, DO NOT include 'Content-Type' headers. 
            // The browser will set it automatically with the correct multi-part boundaries.
            const response = await fetch(`${API_URL}/reviews`, {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                reviewForm.reset(); // Clear form fields and file slot on success
            } else {
                const data = await response.json();
                alert(data.message || 'Error publishing comment parameters.');
            }
        } catch (err) {
            console.error(err);
            alert('Could not synchronize data upload with server engine.');
        }
    });
}

// 4. WebSocket Event Listener: Catch new reviews broadcast from the server
socket.on('review_published', (newReview) => {
    // If the "No reviews" placeholder text is showing, clear it out first
    if (reviewsContainer.innerHTML.includes('Be the first to share') || reviewsContainer.innerHTML.includes('Loading client stories')) {
        reviewsContainer.innerHTML = '';
    }

    // Convert data record directly into HTML and prepend it at the top of the grid list immediately!
    const cardHTML = renderReviewCard(newReview);
    reviewsContainer.insertAdjacentHTML('afterbegin', cardHTML);
});

// 5. Function that fires when a user clicks the "✕" delete button
async function deleteReview(reviewId) {
    if (!confirm("Are you sure you want to permanently delete this review?")) return;

    try {
        const response = await fetch(`${API_URL}/reviews/${reviewId}`, {
            method: 'DELETE'
        });

        const data = await response.json();
        if (!response.ok) {
            alert(data.message || "Failed to remove the review.");
        }
    } catch (err) {
        console.error("Delete request pipeline failure:", err);
        alert("Could not connect to the server environment.");
    }
}

// 6. WebSocket Live Event Listener: Catch deletions broadcasted from the server
socket.on('review_deleted', (deletedId) => {
    const targetCard = document.getElementById(`review-${deletedId}`);
    if (targetCard) {
        // Drop the item container from the DOM live
        targetCard.remove();
    }
    
    // If the window layout becomes completely empty, append a clean placeholder
    if (reviewsContainer.children.length === 0) {
        reviewsContainer.innerHTML = `<p style="text-align: center; color: #666; width: 100%;">Be the first to share an experience!</p>`;
    }
});
