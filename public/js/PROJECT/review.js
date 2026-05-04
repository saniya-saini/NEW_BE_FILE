// ─── review.js ────────────────────────────────────────────────────────────────
// Connects to backend routes:
//   GET    /reviews         → load all reviews (sorted by query param)
//   GET    /reviews/stats   → get stats (avg rating, total, positive%)
//   POST   /reviews         → submit a review (session auth)
//   DELETE /reviews/:id     → delete own review (session auth)

const API_URL = 'http://localhost:3000/reviews';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getCurrentUserName() {
    try {
        const user = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
        return user.name || 'Anonymous User';
    } catch {
        return 'Anonymous User';
    }
}

function formatRelativeTime(date) {
    const now     = new Date();
    const diffMs  = now - new Date(date);
    const diffMins  = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays  = Math.floor(diffMs / 86400000);

    if (diffMins < 1)   return 'Just now';
    if (diffMins < 60)  return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
    if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    if (diffDays < 7)   return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
    if (diffDays < 30)  return `${Math.floor(diffDays / 7)} ${Math.floor(diffDays / 7) === 1 ? 'week' : 'weeks'} ago`;
    return `${Math.floor(diffDays / 30)} ${Math.floor(diffDays / 30) === 1 ? 'month' : 'months'} ago`;
}

function createStarRating(rating) {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        stars += `<span style="color: ${i <= rating ? '#f6ad55' : '#cbd5e0'}">${i <= rating ? '★' : '☆'}</span>`;
    }
    return stars;
}

// ─── Load stats from backend ──────────────────────────────────────────────────
async function loadStats() {
    try {
        const response = await fetch(`${API_URL}/stats`, { credentials: 'include' });
        if (!response.ok) return;
        const stats = await response.json();

        // Update stat cards
        const statCards = document.querySelectorAll('.stat-card .stat-content h3');
        if (statCards.length >= 3) {
            statCards[0].textContent = stats.averageRating || '0.0';
            statCards[1].textContent = stats.totalReviews?.toLocaleString() || '0';
            statCards[2].textContent = (stats.positivePercent || 0) + '%';
        }

        // Update right sidebar stat
        const totalReviewsStat = document.querySelector('.stat-item .stat-value');
        if (totalReviewsStat) totalReviewsStat.textContent = stats.totalReviews || '0';
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// ─── Load user profile into right sidebar ─────────────────────────────────────
async function loadUserProfile() {
    try {
        // Try to fetch from session via a lightweight endpoint (newdashboard sets session)
        const name  = getCurrentUserName();
        const profileName = document.querySelector('.profile-name');
        if (profileName && name !== 'Anonymous User') {
            profileName.textContent = name;
        }
    } catch (e) { /* non-critical */ }
}

// ─── Display a single review card ────────────────────────────────────────────
function displayReview(review, prepend = true) {
    const reviewsList = document.querySelector('.reviews-list');
    if (!reviewsList) return;

    const reviewId      = review.id || review._id || '';
    const reviewAuthor  = review.author || review.userName || 'Anonymous';
    const currentUser   = getCurrentUserName();
    const canDelete     = reviewAuthor === currentUser && currentUser !== 'Anonymous User';

    const reviewCard = document.createElement('div');
    reviewCard.className = 'review-card';
    if (reviewId) reviewCard.dataset.reviewId = reviewId;

    const deleteButton = canDelete ? `
        <div style="margin-top: 12px;">
            <button class="delete-review-btn" onclick="handleDeleteReview('${reviewId}', this)" title="Delete this review">
                🗑️ Delete My Review
            </button>
        </div>` : '';

    reviewCard.innerHTML = `
        <div class="review-header">
            <div class="review-route">${review.route || 'N/A'}</div>
            <div class="review-rating-display">${createStarRating(review.rating)}</div>
        </div>
        <div class="review-content">
            <div class="review-text">${review.text || review.reviewText || ''}</div>
        </div>
        <div class="review-meta">
            <span class="review-author">${reviewAuthor}</span>
            <span class="review-date">${formatRelativeTime(review.date || review.createdAt || new Date())}</span>
        </div>
        ${deleteButton}`;

    if (prepend) {
        reviewsList.insertBefore(reviewCard, reviewsList.firstChild);
    } else {
        reviewsList.appendChild(reviewCard);
    }
}

// ─── Load all reviews from backend ───────────────────────────────────────────
async function loadReviews(sortBy = 'newest') {
    const reviewsList = document.querySelector('.reviews-list');
    if (!reviewsList) return;

    // Clear only the dynamically loaded reviews, keep static samples if desired
    // For full backend integration: clear all and re-render
    reviewsList.innerHTML = '<div class="loading-reviews" style="text-align:center;padding:20px;color:#718096;">Loading reviews...</div>';

    try {
        const response = await fetch(`${API_URL}?sort=${sortBy}`, { credentials: 'include' });
        if (!response.ok) {
            reviewsList.innerHTML = '<div style="text-align:center;padding:20px;color:#718096;">Could not load reviews.</div>';
            return;
        }
        const reviews = await response.json();
        reviewsList.innerHTML = '';

        if (!Array.isArray(reviews) || reviews.length === 0) {
            reviewsList.innerHTML = '<div style="text-align:center;padding:30px;color:#718096;">No reviews yet. Be the first to write one!</div>';
            return;
        }

        reviews.forEach(review => displayReview(review, false)); // append in order
    } catch (error) {
        console.error('Error loading reviews:', error);
        reviewsList.innerHTML = '<div style="text-align:center;padding:20px;color:#e53e3e;">Failed to load reviews. Please refresh.</div>';
    }
}

// ─── Handle delete review ─────────────────────────────────────────────────────
window.handleDeleteReview = async function (reviewId, buttonElement) {
    if (!confirm('Are you sure you want to delete this review? This cannot be undone.')) return;

    const reviewCard = buttonElement.closest('.review-card');
    buttonElement.disabled = true;
    buttonElement.textContent = 'Deleting...';

    try {
        const response = await fetch(`${API_URL}/${reviewId}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        if (response.ok) {
            reviewCard.style.transition = 'opacity 0.4s, transform 0.4s';
            reviewCard.style.opacity   = '0';
            reviewCard.style.transform = 'translateX(-30px)';
            setTimeout(() => {
                reviewCard.remove();
                alert('Review deleted successfully!');
                loadStats(); // Refresh stats after delete
            }, 400);
        } else {
            const data = await response.json().catch(() => ({}));
            alert(data.message || 'Failed to delete review. Please try again.');
            buttonElement.disabled = false;
            buttonElement.textContent = '🗑️ Delete My Review';
        }
    } catch (error) {
        console.error('Error deleting review:', error);
        alert('Failed to delete review. Please try again.');
        buttonElement.disabled = false;
        buttonElement.textContent = '🗑️ Delete My Review';
    }
};

// ─── Submit review form ───────────────────────────────────────────────────────
async function handleReviewSubmit(e) {
    e.preventDefault();

    const routeSelect  = document.getElementById('routeSelect');
    const ratingInput  = document.querySelector('input[name="rating"]:checked');
    const reviewText   = document.getElementById('reviewText');
    const submitBtn    = document.querySelector('.btn--primary');

    // Validate
    if (!routeSelect || !routeSelect.value) {
        alert('Please select a route.');
        return;
    }
    if (!ratingInput) {
        alert('Please select a star rating.');
        return;
    }
    if (!reviewText || !reviewText.value.trim()) {
        alert('Please write your review.');
        return;
    }

    // Check word count
    const wordCount = reviewText.value.trim().split(/\s+/).length;
    if (wordCount > 200) {
        alert(`Your review is ${wordCount} words. Please keep it under 200 words.`);
        return;
    }

    // Disable button during submission
    submitBtn.disabled     = true;
    submitBtn.textContent  = 'Submitting...';

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                route:       routeSelect.value,
                rating:      parseInt(ratingInput.value),
                reviewText:  reviewText.value.trim()
            })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            // Display the new review at the top
            const reviewWithId = {
                ...data.review,
                id: data.id || data.review?.id || data.review?._id
            };
            displayReview(reviewWithId, true);

            alert('✅ Your review has been submitted successfully!');

            // Reset form
            e.target.reset();
            document.querySelectorAll('.review-rating label').forEach(l => l.classList.remove('selected'));

            // Refresh stats
            loadStats();
        } else if (response.status === 401) {
            alert('Your session has expired. Please log in again.');
            window.location.href = '/login';
        } else {
            alert(data.message || 'Failed to submit review. Please try again.');
        }
    } catch (error) {
        console.error('Error submitting review:', error);
        alert('Failed to submit review. Please check your connection.');
    } finally {
        submitBtn.disabled    = false;
        submitBtn.textContent = 'Submit Review';
    }
}

// ─── Sign out ─────────────────────────────────────────────────────────────────
async function handleSignOut() {
    try {
        await fetch('http://localhost:3000/api/logout', { method: 'POST', credentials: 'include' });
    } catch (e) { /* ignore */ }
    window.location.href = '/login';
}

// ─── DOMContentLoaded ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {

    // Load data
    loadReviews('newest');
    loadStats();
    loadUserProfile();

    // Sort dropdown
    const sortSelect = document.querySelector('.sort-options select');
    if (sortSelect) {
        sortSelect.addEventListener('change', function () {
            loadReviews(this.value);
        });
    }

    // Review form submit
    const reviewForm = document.querySelector('.review-form');
    if (reviewForm) {
        reviewForm.addEventListener('submit', handleReviewSubmit);
    }

    // Star rating interactive highlight
    const ratingLabels = document.querySelectorAll('.review-rating label');
    if (ratingLabels.length > 0) {
        ratingLabels.forEach((label, index) => {
            label.addEventListener('click', function () {
                ratingLabels.forEach(l => l.classList.remove('selected'));
                for (let i = 0; i <= index; i++) {
                    ratingLabels[i].classList.add('selected');
                }
                const input = document.getElementById(`star${index + 1}`);
                if (input) input.checked = true;
            });

            // Hover preview
            label.addEventListener('mouseenter', function () {
                ratingLabels.forEach((l, i) => {
                    l.style.color = i <= index ? '#f6ad55' : '';
                });
            });
            label.addEventListener('mouseleave', function () {
                ratingLabels.forEach(l => { l.style.color = ''; });
            });
        });
    }

    // Right sidebar (user profile panel)
    const userProfileIcon = document.querySelector('.user-profile-icon');
    const rightSidebar    = document.getElementById('rightSidebar');
    const closeSidebar    = document.getElementById('closeSidebar');

    if (userProfileIcon && rightSidebar) {
        userProfileIcon.addEventListener('click', function () {
            rightSidebar.classList.add('open');
        });
    }
    if (closeSidebar && rightSidebar) {
        closeSidebar.addEventListener('click', function () {
            rightSidebar.classList.remove('open');
        });
    }
    document.addEventListener('click', function (e) {
        if (rightSidebar &&
            rightSidebar.classList.contains('open') &&
            !rightSidebar.contains(e.target) &&
            userProfileIcon && !userProfileIcon.contains(e.target)) {
            rightSidebar.classList.remove('open');
        }
    });

    // Load more button
    const loadMoreBtn = document.querySelector('.load-more-btn');
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', function () {
            this.textContent = 'All reviews are loaded above.';
            this.disabled = true;
        });
    }

    // Nav items active state
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', function () {
            navItems.forEach(i => i.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // Sign out
    const signOutEl = document.querySelector('.sign-out');
    if (signOutEl) {
        signOutEl.addEventListener('click', function (e) {
            e.preventDefault();
            handleSignOut();
        });
    }
});