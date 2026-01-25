document.addEventListener('DOMContentLoaded', () => {
    const authModal = document.getElementById('auth-modal');
    const closeAuth = document.getElementById('close-auth');
    const showAuthBtns = document.querySelectorAll('.show-auth');
    const nav = document.getElementById('landing-nav');

    // Show Modal
    showAuthBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            authModal.style.display = 'flex';
            document.body.style.overflow = 'hidden'; // Stop scrolling
        });
    });

    // Close Modal
    if (closeAuth) {
        closeAuth.addEventListener('click', () => {
            authModal.style.display = 'none';
            document.body.style.overflow = 'auto'; // Enable scrolling
        });
    }

    // Close on outside click
    window.addEventListener('click', (e) => {
        if (e.target === authModal) {
            authModal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    });

    // Navbar scroll effect
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            nav.style.padding = '12px 5%';
            nav.style.background = 'rgba(5, 5, 5, 0.8)';
        } else {
            nav.style.padding = '20px 5%';
            nav.style.background = 'rgba(5, 5, 5, 0.5)';
        }
    });

    // Reveal animations on scroll
    const observerOptions = {
        threshold: 0.05 // Trigger earlier
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    document.querySelectorAll('.feature-card, .stat-item, .section-header').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'all 0.6s cubic-bezier(0.23, 1, 0.32, 1)';
        observer.observe(el);
    });

    // LISTEN FOR ONLINE COUNT
    if (window.sharedSocket) {
        window.sharedSocket.on('online count', (count) => {
            const el = document.getElementById('welcome-online');
            if (el) el.textContent = count;
        });
        // Initial request
        window.sharedSocket.emit('get online count');
    }

    // Mutation observer to handle reveal class
    const style = document.createElement('style');
    style.textContent = `
        .revealed {
            opacity: 1 !important;
            transform: translateY(0) !important;
        }
    `;
    document.head.appendChild(style);
});

// Function to call when game starts
window.hideLandingPage = () => {
    const landing = document.querySelector('.landing-page-root');
    const nav = document.querySelector('nav');
    const authModal = document.getElementById('auth-modal');

    if (landing) landing.classList.add('hide');
    if (nav) nav.style.display = 'none';
    if (authModal) authModal.style.display = 'none';

    document.body.style.overflow = 'hidden';

    setTimeout(() => {
        if (landing) landing.style.display = 'none';
    }, 1000);
};
