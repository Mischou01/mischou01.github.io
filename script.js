document.addEventListener('DOMContentLoaded', () => {
    // ---- Theme Switching Logic ----
    const toggleSwitch = document.querySelector('.theme-switch input[type="checkbox"]');
    const currentTheme = localStorage.getItem('theme');

    if (currentTheme) {
        document.documentElement.setAttribute('data-theme', currentTheme);
        if (currentTheme === 'dark') {
            toggleSwitch.checked = true;
        }
    } else {
        // Check for system preference
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.documentElement.setAttribute('data-theme', 'dark');
            toggleSwitch.checked = true;
        }
    }

    function switchTheme(e) {
        if (e.target.checked) {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.setAttribute('data-theme', 'light');
            localStorage.setItem('theme', 'light');
        }    
    }

    toggleSwitch.addEventListener('change', switchTheme, false);

    // ---- Navigation Logic ----
    const navButtons = document.querySelectorAll('.nav-btn');
    const navInlineButtons = document.querySelectorAll('.nav-btn-inline');
    const sections = document.querySelectorAll('.content section');

    function navigateToSection(targetId) {
        // Hide all sections
        sections.forEach(section => {
            section.classList.remove('active-section');
            section.classList.add('hidden-section');
        });

        // Show target section
        const targetSection = document.getElementById(targetId);
        if (targetSection) {
            targetSection.classList.remove('hidden-section');
            targetSection.classList.add('active-section');
        }

        // Update active state on sidebar nav
        navButtons.forEach(btn => {
            btn.classList.remove('active');
            if (btn.getAttribute('data-target') === targetId) {
                btn.classList.add('active');
            }
        });
    }

    // Attach click events to sidebar buttons
    navButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const target = btn.getAttribute('data-target');
            navigateToSection(target);
        });
    });

    // Attach click events to inline buttons (like "Learn more about me")
    navInlineButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const target = btn.getAttribute('data-target');
            navigateToSection(target);
        });
    });

    // Optional: Handle hash in URL on load
    if (window.location.hash) {
        const hash = window.location.hash.substring(1); // remove '#'
        if (document.getElementById(hash)) {
            navigateToSection(hash);
        }
    }
});