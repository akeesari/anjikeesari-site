// Make all external links (to Medium.com) open in a new tab.
// Runs on every page, including pages loaded by Material's instant navigation.
document$.subscribe(function() {
    // Select all links on the page
    var links = document.querySelectorAll('a');

    links.forEach(function(link) {
        var href = link.getAttribute('href');

        // Check if the link is external (contains medium.com or starts with http/https and not the current domain)
        if (href && (href.includes('medium.com') ||
           (href.startsWith('http') && !href.includes(window.location.hostname)))) {
            link.setAttribute('target', '_blank');
            link.setAttribute('rel', 'noopener noreferrer'); // Security best practice
        }
    });
});

document.addEventListener('DOMContentLoaded', function() {
    // Make site name in header clickable and link to homepage
    var headerTitle = document.querySelector('.md-header__title');
    if (headerTitle) {
        // Remove any existing link if present and wrap content
        var existingLink = headerTitle.querySelector('a');
        if (!existingLink) {
            // Make the entire title clickable
            headerTitle.style.cursor = 'pointer';
            headerTitle.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                window.location.href = '/';
            });
        }
    }
});

// ============================================
// TEXT-TO-SPEECH FEATURE
// ============================================

let listenButton = null;
let isPlaying = false;
let isPaused = false;
let utterance = null;

function initializeTTS() {
    // Only run on article, research, and tools pages
    const isArticleOrResearch = window.location.pathname.includes('/articles/') || 
                                window.location.pathname.includes('/research/') ||
                                window.location.pathname.includes('/developertools/');
    
    if (!isArticleOrResearch) {
        // Clean up if button exists from previous page
        if (listenButton && listenButton.parentElement) {
            listenButton.remove();
            listenButton = null;
        }
        return;
    }

    // Find the main article heading and inject the button
    const articleHeading = document.querySelector('.md-content h1');
    if (!articleHeading) return;

    // Check if button already exists
    if (listenButton && listenButton.parentElement === articleHeading) return;

    // Create button element
    listenButton = document.createElement('button');
    listenButton.id = 'listen-button';
    listenButton.className = 'listen-icon-btn';
    listenButton.setAttribute('aria-label', 'Listen to article');
    listenButton.setAttribute('title', 'Click: Play/Pause | Double-click: Stop');
    listenButton.innerHTML = '<span class="listen-icon">🔊</span>';
    
    // Append to heading
    articleHeading.appendChild(listenButton);

    // Check if browser supports speech synthesis
    if (!('speechSynthesis' in window)) {
        listenButton.style.display = 'none';
        return;
    }

    // Reset state when navigating to new page
    if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
    }
    isPlaying = false;
    isPaused = false;

    listenButton.addEventListener('click', function(e) {
        e.preventDefault();
        
        if (isPlaying && !isPaused) {
            window.speechSynthesis.pause();
            isPaused = true;
            updateButtonState();
        } else if (isPaused) {
            window.speechSynthesis.resume();
            isPaused = false;
            updateButtonState();
        } else {
            speakPageContent();
        }
    });

    // Double-click to stop completely
    listenButton.addEventListener('dblclick', function(e) {
        e.preventDefault();
        window.speechSynthesis.cancel();
        isPlaying = false;
        isPaused = false;
        updateButtonState();
    });

    function speakPageContent() {
        // Try multiple selectors to find the main content
        const contentElement = document.querySelector('.md-content__inner article') ||
                              document.querySelector('.md-content article') ||
                              document.querySelector('article.md-content__inner') ||
                              document.querySelector('.md-content__inner');
        
        if (!contentElement) {
            console.error('Text-to-speech: Could not find page content');
            alert('Could not find page content to read');
            return;
        }

        // Clone the element to avoid modifying the original
        const clone = contentElement.cloneNode(true);
        
        // Remove code blocks, navigation, and other non-readable elements
        const elementsToRemove = clone.querySelectorAll(
            'pre, code, .md-nav, .md-footer, .md-header, ' +
            '.md-sidebar, script, style, .listen-container, ' +
            '.headerlink, .md-annotation, .md-source-file, ' +
            '.md-content__button, button, nav, aside, ' +
            '.md-typeset__scrollwrap, .md-typeset__table, ' +
            'h1, .admonition-title, ' +
            // Articles: breadcrumb, byline, related cards, hub list and its search-only copy
            '.ak-articles, .ak-search-index'
        );
        elementsToRemove.forEach(el => el.remove());

        // Get the text content
        let text = clone.textContent || clone.innerText || '';
        
        // Clean up the text
        text = text
            .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
            .replace(/\n+/g, '. ') // Replace newlines with periods
            .replace(/\.\s*\./g, '.') // Remove double periods
            .trim();

        console.log('Reading text preview:', text.substring(0, 200));

        if (!text) {
            alert('No content to read');
            return;
        }

        // Create utterance
        utterance = new SpeechSynthesisUtterance(text);
        
        // Configure speech
        utterance.rate = 1.0;    // Speed (0.1 to 10)
        utterance.pitch = 1.0;   // Pitch (0 to 2)
        utterance.volume = 1.0;  // Volume (0 to 1)
        
        // Event handlers
        utterance.onstart = function() {
            isPlaying = true;
            updateButtonState();
        };
        
        utterance.onend = function() {
            console.log('TTS: Speech ended');
            isPlaying = false;
            isPaused = false;
            updateButtonState();
        };
        
        utterance.onerror = function(event) {
            // Ignore "interrupted" errors (they're expected when pausing)
            if (event.error !== 'interrupted') {
                console.error('Text-to-speech error:', event.error);
                isPlaying = false;
                isPaused = false;
                updateButtonState();
            }
        };

        // Start speaking
        window.speechSynthesis.speak(utterance);
    }

    function updateButtonState() {
        const icon = listenButton.querySelector('.listen-icon');
        
        if (isPlaying && !isPaused) {
            icon.textContent = '⏸️';
            listenButton.setAttribute('aria-label', 'Pause reading');
            listenButton.classList.add('listening');
        } else if (isPaused) {
            icon.textContent = '▶️';
            listenButton.setAttribute('aria-label', 'Resume reading');
            listenButton.classList.remove('listening');
        } else {
            icon.textContent = '🔊';
            listenButton.setAttribute('aria-label', 'Listen to article');
            listenButton.classList.remove('listening');
        }
    }

    // Clean up when navigating away
    window.addEventListener('beforeunload', function() {
        if (isPlaying) {
            window.speechSynthesis.cancel();
        }
    });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initializeTTS);

// Re-initialize on Material navigation (instant loading)
document$.subscribe(function() {
    initializeTTS();
});

// ============================================
// ARTICLES HUB (articles/1-article-collection/)
// Topic filter, text filter and sort over the server-rendered rows
// (partials/ak-articles.html). Rows are moved, not rebuilt, so link
// attributes set above (Medium links in a new tab) are kept.
// ?topic=<key> preselects a topic.
// ============================================

function initializeArticlesHub() {
    const list = document.getElementById('ak-list');
    if (!list) return;
    // Topic sections show their newest PREVIEW cards until a topic or search is chosen
    const PREVIEW = 6;
    const sections = Array.from(list.querySelectorAll('.ak-sec'));
    const featured = document.getElementById('ak-featured');
    const search = document.getElementById('ak-q');
    const sort = document.getElementById('ak-sort');
    const empty = document.getElementById('ak-empty');
    const buttons = Array.from(document.querySelectorAll('.ak-f[data-f], .ak-chip[data-f]'));
    const topics = buttons.map(function(b) { return b.dataset.f; });
    const requested = new URLSearchParams(window.location.search).get('topic');
    let topic = topics.includes(requested) ? requested : 'all';

    function byOrder(order) {
        return function(a, b) {
            if (order === 'short') return Number(a.dataset.mins) - Number(b.dataset.mins);
            // Undated cards go last in both date orders
            const x = a.dataset.date || (order === 'old' ? '9999' : '0000');
            const y = b.dataset.date || (order === 'old' ? '9999' : '0000');
            return order === 'old' ? x.localeCompare(y) : y.localeCompare(x);
        };
    }

    function render() {
        const text = search.value.trim().toLowerCase();
        const browsing = topic === 'all' && !text;
        let shownTotal = 0;
        sections.forEach(function(sec) {
            const grid = sec.querySelector('.ak-grid');
            const cards = Array.from(grid.children).sort(byOrder(sort.value));
            const match = cards.filter(function(c) {
                return (topic === 'all' || c.dataset.cat === topic) && c.dataset.text.includes(text);
            });
            // While browsing, featured articles show only in the Featured row
            const preview = browsing ? match.filter(function(c) { return !c.dataset.feat; }) : match;
            const limit = browsing ? PREVIEW : Infinity;
            cards.forEach(function(c) {
                const i = preview.indexOf(c);
                c.hidden = i < 0 || i >= limit;
                grid.appendChild(c);
            });
            sec.hidden = match.length === 0;
            sec.querySelector('.ak-more').hidden = preview.length <= limit;
            shownTotal += match.length;
        });
        if (featured) featured.hidden = !browsing;
        empty.hidden = shownTotal > 0;
        buttons.forEach(function(b) {
            const on = b.dataset.f === topic;
            b.classList.toggle('on', on);
            b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
    }

    function choose(f) {
        topic = f;
        const url = new URL(window.location.href);
        if (topic === 'all') url.searchParams.delete('topic');
        else url.searchParams.set('topic', topic);
        history.replaceState(history.state, '', url);
        render();
    }

    buttons.forEach(function(b) {
        b.addEventListener('click', function() { choose(b.dataset.f); });
    });
    // "View all N" opens that topic and scrolls back to the filters
    list.querySelectorAll('.ak-more').forEach(function(b) {
        b.addEventListener('click', function() {
            choose(b.dataset.f);
            search.scrollIntoView({ block: 'center' });
        });
    });
    search.addEventListener('input', render);
    sort.addEventListener('change', render);
    render();
}

document$.subscribe(initializeArticlesHub);
