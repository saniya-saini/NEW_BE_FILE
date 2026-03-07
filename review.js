        const API_URL = "http://localhost:3000/reviews";
        
        // Get current user name from sessionStorage
        function getCurrentUserName() {
            try {
                const user = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
                return user.name || 'Anonymous User';
            } catch {
                return 'Anonymous User';
            }
        }

        // Format date to relative time (e.g., "2 days ago")
        function formatRelativeTime(date) {
            const now = new Date();
            const diffMs = now - new Date(date);
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMs / 3600000);
            const diffDays = Math.floor(diffMs / 86400000);

            if (diffMins < 1) return 'Just now';
            if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
            if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
            if (diffDays < 7) return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
            if (diffDays < 30) return `${Math.floor(diffDays / 7)} ${Math.floor(diffDays / 7) === 1 ? 'week' : 'weeks'} ago`;
            return `${Math.floor(diffDays / 30)} ${Math.floor(diffDays / 30) === 1 ? 'month' : 'months'} ago`;
        }

        // Create star rating display
        function createStarRating(rating) {
            let stars = '';
            for (let i = 1; i <= 5; i++) {
                stars += i <= rating ? '<span>★</span>' : '<span>☆</span>';
            }
            return stars;
        }

        // Check if review belongs to current user
        function isMyReview(review) {
            const currentUser = getCurrentUserName();
            const reviewAuthor = review.author || review.userName || '';
            return reviewAuthor === currentUser && currentUser !== 'Anonymous User';
        }

        // Delete review from API
        async function deleteReview(reviewId) {
            try {
                const response = await fetch(`${API_URL}/${reviewId}`, {
                    method: 'DELETE'
                });
                return response.ok;
            } catch (error) {
                console.error('Error deleting review:', error);
                return false;
            }
        }

        // Display a single review
        function displayReview(review) {
            const reviewsList = document.querySelector('.reviews-list');
            if (!reviewsList) return;

            const reviewCard = document.createElement('div');
            reviewCard.className = 'review-card';
            const reviewId = review.id || review._id || '';
            reviewCard.dataset.reviewId = reviewId;
            
            // Check if user can delete (must be the author)
            const currentUser = getCurrentUserName();
            const reviewAuthor = review.author || review.userName || '';
            // Show delete button if author matches current user (even without ID for local deletion)
            const canDelete = reviewAuthor === currentUser && currentUser !== 'Anonymous User';
            
            const deleteButton = canDelete ? `
                <div style="margin-top: 12px;">
                    <button class="delete-review-btn" onclick="handleDeleteReview('${reviewId}', this)" title="Delete this review">
                        🗑️ Delete
                    </button>
                </div>
            ` : '';

            reviewCard.innerHTML = `
                <div class="review-header">
                    <div class="review-route">${review.route || 'N/A'}</div>
                    <div class="review-rating-display">
                        ${createStarRating(review.rating)}
                    </div>
                </div>
                <div class="review-content">
                    <div class="review-text">${review.text || review.reviewText || ''}</div>
                </div>
                <div class="review-meta">
                    <span class="review-author">${reviewAuthor || 'Anonymous'}</span>
                    <span class="review-date">${formatRelativeTime(review.date || review.createdAt || new Date())}</span>
                </div>
                ${deleteButton}
            `;

            // Insert at the beginning of the list (newest first)
            reviewsList.insertBefore(reviewCard, reviewsList.firstChild);
        }

        // Handle delete review
        window.handleDeleteReview = async function(reviewId, buttonElement) {
            if (!confirm('Are you sure you want to delete this review?')) {
                return;
            }

            const reviewCard = buttonElement.closest('.review-card');
            
            // Try to delete from API if we have a valid ID (not a temp ID)
            let deleted = false;
            if (reviewId && !reviewId.startsWith('temp_')) {
                deleted = await deleteReview(reviewId);
            } else {
                // For local-only reviews (temp IDs), just remove from UI
                deleted = true;
            }
            
            if (deleted) {
                // Remove from UI with animation
                reviewCard.style.transition = 'opacity 0.3s, transform 0.3s';
                reviewCard.style.opacity = '0';
                reviewCard.style.transform = 'translateX(-20px)';
                setTimeout(() => {
                    reviewCard.remove();
                }, 300);
                alert('Review deleted successfully!');
            } else {
                alert('Failed to delete review. Please try again.');
            }
        };

        // Load all reviews from API
        async function loadReviews() {
            try {
                const response = await fetch(API_URL);
                if (!response.ok) {
                    console.warn('Reviews API not available, using sample reviews');
                    return;
                }
                const reviews = await response.json();
                
                const reviewsList = document.querySelector('.reviews-list');
                if (reviewsList && Array.isArray(reviews) && reviews.length > 0) {
                    // Display API reviews (newest first)
                    reviews.sort((a, b) => new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0));
                    reviews.forEach(review => {
                        displayReview(review);
                    });
                }
            } catch (error) {
                console.error('Error loading reviews:', error);
                // Continue with sample reviews if API fails
            }
        }

        // Add delete buttons to existing sample reviews on page load
        function addDeleteButtonsToSampleReviews() {
            const reviewsList = document.querySelector('.reviews-list');
            if (!reviewsList) return;

            const sampleReviewCards = reviewsList.querySelectorAll('.review-card:not([data-review-id])');
            const currentUser = getCurrentUserName();
            
            sampleReviewCards.forEach(card => {
                const authorElement = card.querySelector('.review-author');
                if (authorElement) {
                    const author = authorElement.textContent.trim();
                    // For sample reviews, show delete button if author matches (for testing)
                    // In production, you might want to remove this or make it more restrictive
                    if (author === currentUser && currentUser !== 'Anonymous User') {
                        const deleteBtn = document.createElement('button');
                        deleteBtn.className = 'delete-review-btn';
                        deleteBtn.textContent = '🗑️ Delete';
                        deleteBtn.style.marginTop = '12px';
                        deleteBtn.onclick = function() {
                            if (confirm('Are you sure you want to delete this review?')) {
                                card.style.transition = 'opacity 0.3s';
                                card.style.opacity = '0';
                                setTimeout(() => card.remove(), 300);
                                alert('Review deleted!');
                            }
                        };
                        card.appendChild(deleteBtn);
                    }
                }
            });
        }

        // Save review to API
        async function saveReview(reviewData) {
            try {
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(reviewData)
                });

                if (response.ok) {
                    const savedReview = await response.json();
                    return savedReview;
                } else {
                    throw new Error('Failed to save review');
                }
            } catch (error) {
                console.error('Error saving review:', error);
                // Even if API fails, show the review locally
                return reviewData;
            }
        }

        document.addEventListener('DOMContentLoaded', function() {
            // Load existing reviews
            loadReviews();
            
            // Add delete buttons to sample reviews after a short delay
            setTimeout(addDeleteButtonsToSampleReviews, 500);

            const navItems = document.querySelectorAll('.nav-item');
            navItems.forEach(item => {
                item.addEventListener('click', function() {
                    navItems.forEach(i => i.classList.remove('active'));
                    this.classList.add('active');
                });
            });

            const reviewForm = document.querySelector('.review-form');
            if (reviewForm) {
                reviewForm.addEventListener('submit', async function(e) {
                    e.preventDefault();
                    
                    const routeSelect = document.getElementById('routeSelect');
                    const ratingInput = document.querySelector('input[name="rating"]:checked');
                    const reviewText = document.getElementById('reviewText');

                    // Validation
                    if (!routeSelect || !routeSelect.value) {
                        alert('Please select a route');
                        return;
                    }

                    if (!ratingInput) {
                        alert('Please select a rating');
                        return;
                    }

                    if (!reviewText || !reviewText.value.trim()) {
                        alert('Please write a review');
                        return;
                    }

                    // Get form data
                    const reviewData = {
                        route: routeSelect.value,
                        rating: parseInt(ratingInput.value),
                        text: reviewText.value.trim(),
                        reviewText: reviewText.value.trim(), // Also save as reviewText for compatibility
                        author: getCurrentUserName(),
                        userName: getCurrentUserName(),
                        date: new Date().toISOString(),
                        createdAt: new Date().toISOString()
                    };

                    // Save to API
                    const savedReview = await saveReview(reviewData);
                    
                    // Ensure we have an ID for the review (use API ID or generate one)
                    const reviewWithId = {
                        ...reviewData,
                        id: savedReview.id || savedReview._id || `temp_${Date.now()}` // Use timestamp as fallback ID
                    };
                    
                    // Use API returned ID if available
                    if (savedReview && (savedReview.id || savedReview._id)) {
                        reviewWithId.id = savedReview.id || savedReview._id;
                    }

                    // Display immediately with ID
                    displayReview(reviewWithId);
                    
                    // Log for debugging
                    console.log('Review saved:', reviewWithId);

                    // Show success message
                    alert('Your review has been submitted successfully!');
                    
                    // Reset form
                    this.reset();
                    
                    // Reset star selection
                    const ratingLabels = document.querySelectorAll('.review-rating label');
                    ratingLabels.forEach(l => l.classList.remove('selected'));
                });
            }
            const loadMoreBtn = document.querySelector('.load-more-btn');
            if (loadMoreBtn) {
                loadMoreBtn.addEventListener('click', function() {
                    alert('Loading more reviews...');
                });
            }
            const ratingLabels = document.querySelectorAll('.review-rating label');
            if (ratingLabels.length > 0) {
                ratingLabels.forEach((label, index) => {
                    label.addEventListener('click', function() {
                        ratingLabels.forEach(l => l.classList.remove('selected'));
                        for (let i = 0; i <= index; i++) {
                            ratingLabels[i].classList.add('selected');
                        }
                        const input = document.getElementById(`star${index + 1}`);
                        if (input) {
                            input.checked = true;
                        }
                    });
                });
            }

            const userProfileIcon = document.querySelector('.user-profile-icon');
            const rightSidebar = document.getElementById('rightSidebar');
            const closeSidebar = document.getElementById('closeSidebar');

            if (userProfileIcon && rightSidebar) {
                userProfileIcon.addEventListener('click', function() {
                    rightSidebar.classList.add('open');
                });
            }

            if (closeSidebar && rightSidebar) {
                closeSidebar.addEventListener('click', function() {
                    rightSidebar.classList.remove('open');
                });
            }

            document.addEventListener('click', function(e) {
                if (rightSidebar && rightSidebar.classList.contains('open') &&
                    !rightSidebar.contains(e.target) &&
                    !userProfileIcon.contains(e.target)) {
                    rightSidebar.classList.remove('open');
                }
            });
        });
