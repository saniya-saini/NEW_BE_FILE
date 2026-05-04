        async function handleLogout() {
            if (!confirm("Are you sure you want to log out?")) return;
            try {
                const response = await fetch('/api/logout', { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await response.json();
            if (data.success) {
                window.location.href = '/login';
            } else {
                alert("Logout failed: " + (data.message || "Unknown error"));
            }
        } catch (error) {
            alert("An error occurred while trying to log out.");
        }
    }
        
        document.addEventListener('DOMContentLoaded', function() {
            const navItems = document.querySelectorAll('.nav-item');
            navItems.forEach(item => {
                item.addEventListener('click', function() {
                    navItems.forEach(i => i.classList.remove('active'));
                    this.classList.add('active');
                });
            });

            const reviewForm = document.querySelector('.review-form');
            if (reviewForm) {
                reviewForm.addEventListener('submit', function(e) {
                    e.preventDefault();
                    alert('Your review has been submitted successfully!');
                    this.reset();
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
