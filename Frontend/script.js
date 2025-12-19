// === CONFIG ===
const API_BASE_URL = "http://127.0.0.1:8000";

let currentStep = 1;
const totalSteps = 8;

let userData = {
    selectedGenres: [],
    selectedAuthors: [],
    selectedBooks: []
};

const genres = [
    "Fiction", "Fantasy", "Science Fiction", "Mystery", "Thriller",
    "Romance", "Historical Fiction", "Horror", "Young Adult", "Biography",
    "Self-Help", "Science", "History", "Travel", "Cooking", "Art",
    "Philosophy", "Poetry", "Drama", "Comics & Graphic Novels"
];

document.addEventListener('DOMContentLoaded', () => {
    showStep(currentStep);
    populateGenres();
    setupEventListeners();
    updateProgress();
});

function showError(title, text) {
    Swal.fire({
        icon: 'error',
        title,
        text,
        confirmButtonColor: '#2563eb'
    });
}

function showInfo(title, text) {
    Swal.fire({
        icon: 'info',
        title,
        text,
        confirmButtonColor: '#2563eb'
    });
}

function setupEventListeners() {
    document.getElementById('authorSearch').addEventListener('input', handleAuthorSearch);
    document.getElementById('bookSearch').addEventListener('input', handleBookSearch);

    document.addEventListener('click', (e) => {
        if (!e.target.closest('#authorSearch') && !e.target.closest('#authorResults')) {
            document.getElementById('authorResults').classList.add('hidden');
        }
        if (!e.target.closest('#bookSearch') && !e.target.closest('#bookResults')) {
            document.getElementById('bookResults').classList.add('hidden');
        }
    });
}

function populateGenres() {
    const container = document.getElementById('genreContainer');
    container.innerHTML = '';

    genres.forEach(genre => {
        const label = document.createElement('label');
        label.className = 'flex items-center p-3 border border-slate-300 rounded-lg cursor-pointer hover:bg-blue-50 transition interest-tag has-[:checked]:bg-blue-100 has-[:checked]:border-blue-500';

        const input = document.createElement('input');
        input.type = 'checkbox';
        input.name = 'genres';
        input.value = genre.toLowerCase();
        input.className = 'hidden';
        input.addEventListener('change', handleGenreSelection);

        const span = document.createElement('span');
        span.className = 'text-slate-700 text-sm';
        span.textContent = genre;

        label.appendChild(input);
        label.appendChild(span);
        container.appendChild(label);
    });
}

function handleGenreSelection(e) {
    const checkedBoxes = document.querySelectorAll('input[name="genres"]:checked');
    if (checkedBoxes.length > 3) {
        e.target.checked = false;
        showError('Too many genres', 'Please select no more than 3 genres.');
        return;
    }
    userData.selectedGenres = Array.from(checkedBoxes).map(cb => cb.value);
}

// === API-backed search ===
async function handleAuthorSearch(e) {
    const query = e.target.value.trim();
    const resultsContainer = document.getElementById('authorResults');

    if (query.length < 2) {
        resultsContainer.classList.add('hidden');
        return;
    }

    try {
        const res = await fetch(`${API_BASE_URL}/search/authors?q=${encodeURIComponent(query)}`);
        if (!res.ok) throw new Error('Failed to fetch authors');
        const authors = await res.json();
        displaySearchResults(authors, resultsContainer, 'author');
    } catch (err) {
        console.error(err);
        showError('Author search failed', err.message || 'Please try again.');
    }
}

async function handleBookSearch(e) {
    const query = e.target.value.trim();
    const resultsContainer = document.getElementById('bookResults');

    if (query.length < 2) {
        resultsContainer.classList.add('hidden');
        return;
    }

    try {
        const res = await fetch(`${API_BASE_URL}/search/books?q=${encodeURIComponent(query)}`);
        if (!res.ok) throw new Error('Failed to fetch books');
        const books = await res.json(); // array of titles
        displaySearchResults(books, resultsContainer, 'book');
    } catch (err) {
        console.error(err);
        showError('Book search failed', err.message || 'Please try again.');
    }
}

function displaySearchResults(results, container, type) {
    container.innerHTML = '';

    if (!results || results.length === 0) {
        const noResults = document.createElement('div');
        noResults.className = 'p-3 text-slate-500 text-sm';
        noResults.textContent = 'No results found';
        container.appendChild(noResults);
    } else {
        results.forEach(result => {
            const resultItem = document.createElement('div');
            resultItem.className = 'p-3 border-b border-slate-200 cursor-pointer hover:bg-blue-50 transition text-sm';
            resultItem.textContent = result;
            resultItem.addEventListener('click', () => selectSearchResult(result, type));
            container.appendChild(resultItem);
        });
    }

    container.classList.remove('hidden');
}

function selectSearchResult(result, type) {
    if (type === 'author') {
        if (!userData.selectedAuthors.includes(result)) {
            userData.selectedAuthors.push(result);
            updateSelectedAuthors();
        }
        document.getElementById('authorSearch').value = '';
        document.getElementById('authorResults').classList.add('hidden');
    } else if (type === 'book') {
        if (!userData.selectedBooks.includes(result)) {
            userData.selectedBooks.push(result);
            updateSelectedBooks();
        }
        document.getElementById('bookSearch').value = '';
        document.getElementById('bookResults').classList.add('hidden');
    }
}

function updateSelectedAuthors() {
    const container = document.getElementById('selectedAuthors');
    container.innerHTML = '';

    userData.selectedAuthors.forEach(author => {
        const tag = document.createElement('div');
        tag.className = 'bg-blue-100 text-blue-800 px-3 py-1 rounded-full flex items-center text-xs';

        const span = document.createElement('span');
        span.className = 'mr-2';
        span.textContent = author;

        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'text-blue-600 hover:text-blue-800';
        removeBtn.innerHTML = '<i class="fas fa-times"></i>';
        removeBtn.addEventListener('click', () => {
            userData.selectedAuthors = userData.selectedAuthors.filter(a => a !== author);
            updateSelectedAuthors();
        });

        tag.appendChild(span);
        tag.appendChild(removeBtn);
        container.appendChild(tag);
    });
}

function updateSelectedBooks() {
    const container = document.getElementById('selectedBooks');
    container.innerHTML = '';

    userData.selectedBooks.forEach(book => {
        const tag = document.createElement('div');
        tag.className = 'bg-green-100 text-green-800 px-3 py-1 rounded-full flex items-center text-xs';

        const span = document.createElement('span');
        span.className = 'mr-2';
        span.textContent = book;

        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'text-green-600 hover:text-green-800';
        removeBtn.innerHTML = '<i class="fas fa-times"></i>';
        removeBtn.addEventListener('click', () => {
            userData.selectedBooks = userData.selectedBooks.filter(b => b !== book);
            updateSelectedBooks();
        });

        tag.appendChild(span);
        tag.appendChild(removeBtn);
        container.appendChild(tag);
    });
}

function showStep(step) {
    document.querySelectorAll('.step-content').forEach(el => el.classList.remove('active'));
    document.getElementById(`step-${step}`).classList.add('active');
    updateProgress();
}

function updateProgress() {
    const progress = ((currentStep - 1) / (totalSteps - 1)) * 100;
    document.getElementById('progressBar').style.width = `${progress}%`;
    document.getElementById('currentStepDisplay').textContent = currentStep;
    document.getElementById('totalStepsDisplay').textContent = totalSteps;
    document.getElementById('progressPercentage').textContent = Math.round(progress);
}

async function nextStep() {
    if (!validateStep(currentStep)) return;

    if (currentStep < totalSteps) {
        currentStep++;
        showStep(currentStep);

        if (currentStep === totalSteps) {
            await generateRecommendation();
        }
    }
}

function prevStep() {
    if (currentStep > 1) {
        currentStep--;
        showStep(currentStep);
    }
}

function validateStep(step) {
    switch (step) {
        case 1:
            if (!document.getElementById('userName').value.trim()) {
                showError("Missing name", "Please enter your name.");
                return false;
            }
            if (!document.getElementById('birthDate').value) {
                showError("Missing birthday", "Please select your date of birth.");
                return false;
            }
            break;
        case 2:
            if (!document.querySelector('input[name="readingFrequency"]:checked')) {
                showError("Reading frequency", "Please select how often you read.");
                return false;
            }
            if (!document.getElementById('readingTime').value) {
                showError("Reading time", "Please select your preferred reading time.");
                return false;
            }
            break;
        case 3:
            if (!document.querySelector('input[name="readingFormat"]:checked')) {
                showError("Reading format", "Please select at least one reading format.");
                return false;
            }
            if (!document.querySelector('input[name="bookLength"]:checked')) {
                showError("Book length", "Please select your preferred book length.");
                return false;
            }
            break;
        case 4:
            if (userData.selectedGenres.length === 0) {
                showError("Genres", "Please select at least one genre.");
                return false;
            }
            break;
        case 7:
            if (!document.querySelector('input[name="readingMood"]:checked')) {
                showError("Reading mood", "Please select what kind of experience you're looking for.");
                return false;
            }
            if (!document.querySelector('input[name="bookPacing"]:checked')) {
                showError("Book pacing", "Please select your preferred pacing.");
                return false;
            }
            break;
    }
    return true;
}

function collectFormData() {
    const readingFormats = Array.from(document.querySelectorAll('input[name="readingFormat"]:checked'))
        .map(i => i.value);

    return {
        name: document.getElementById('userName').value.trim(),
        birth_date: document.getElementById('birthDate').value,
        reading_frequency: document.querySelector('input[name="readingFrequency"]:checked').value,
        reading_time: document.getElementById('readingTime').value,
        reading_formats: readingFormats,
        book_length: document.querySelector('input[name="bookLength"]:checked').value,
        genres: userData.selectedGenres,
        authors: userData.selectedAuthors,
        liked_books: userData.selectedBooks,
        mood: document.querySelector('input[name="readingMood"]:checked').value,
        pacing: document.querySelector('input[name="bookPacing"]:checked').value,
        language: document.getElementById('preferredLanguage').value || null,
        maturity: document.querySelector('input[name="contentMaturity"]:checked')?.value || null
    };
}

async function generateRecommendation() {
    const userName = document.getElementById('userName').value.trim();
    document.getElementById('userNameDisplay').textContent = userName || 'reader';

    generateHighlights();

    const payload = collectFormData();

    try {
        Swal.fire({
            title: 'Finding your next read...',
            text: 'We’re talking to Google Books and matching your preferences.',
            didOpen: () => Swal.showLoading(),
            allowOutsideClick: false,
            allowEscapeKey: false
        });

        const res = await fetch(`${API_BASE_URL}/recommend`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        Swal.close();

        if (!res.ok) {
            throw new Error('Recommendation service returned an error.');
        }

        const data = await res.json();
        const recs = data.recommendations || [];

        if (recs.length === 0) {
            showInfo('No perfect matches', 'We could not find books for these exact filters. Try relaxing your preferences.');
        }

        displayRecommendations(recs);
    } catch (err) {
        console.error(err);
        showError('Could not load recommendations', err.message || 'Please try again in a moment.');
    }
}

function generateHighlights() {
    const list = document.getElementById('highlightList');
    list.innerHTML = '';
    const highlights = [];

    if (userData.selectedGenres.length > 0) {
        highlights.push(`Focus on your favorite genres: ${userData.selectedGenres.join(', ')}.`);
    }
    if (userData.selectedAuthors.length > 0) {
        highlights.push(`Similar vibe to authors you enjoy like ${userData.selectedAuthors.slice(0, 2).join(' and ')}.`);
    }

    const mood = document.querySelector('input[name="readingMood"]:checked')?.value;
    if (mood) {
        const moodText = {
            light: 'Light and easy-to-read stories.',
            thoughtful: 'Deeper, more reflective themes.',
            emotional: 'Emotionally engaging and character-driven narratives.',
            adventurous: 'Exciting, plot-driven adventures.'
        }[mood];
        highlights.push(moodText);
    }

    const pacing = document.querySelector('input[name="bookPacing"]:checked')?.value;
    if (pacing) {
        highlights.push(`Matched to your preferred ${pacing} pacing.`);
    }

    const length = document.querySelector('input[name="bookLength"]:checked')?.value;
    if (length) {
        highlights.push(`Optimized for a ${length} length so it fits your schedule.`);
    } 

    if (highlights.length === 0) {
        highlights.push('Matched using your profile and general popularity.');
    }

    highlights.forEach(h => {
        const li = document.createElement('li');
        li.textContent = h;
        list.appendChild(li);
    });
}

function displayRecommendations(recommendations) {
    const container = document.getElementById('recommendationResults');
    container.innerHTML = '';

    if (!recommendations || recommendations.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'text-sm text-slate-500';
        empty.textContent = 'No recommendations yet. Try changing your filters and run again.';
        container.appendChild(empty);
        return;
    }

    recommendations.forEach(book => {
        const card = document.createElement('div');
        card.className = 'book-card bg-white rounded-lg p-4 border border-slate-200 flex';

        card.innerHTML = `
                    <div class="flex-shrink-0 mr-4">
                        <img src="${book.cover}" alt="${book.title}" class="w-24 h-32 object-cover rounded-md border border-slate-200">
                    </div>
                    <div class="flex-grow">
                        <h3 class="font-bold text-base text-slate-900">${book.title}</h3>
                        <p class="text-slate-600 text-sm mb-1">by ${book.author}</p>
                        <div class="flex items-center mb-2 text-xs">
                            <div class="flex text-yellow-400 mr-1">
                                ${'<i class="fas fa-star"></i>'.repeat(Math.floor(book.rating || 0))}
                                ${(book.rating || 0) % 1 >= 0.5 ? '<i class="fas fa-star-half-alt"></i>' : ''}
                            </div>
                            <span class="text-slate-500">${book.rating ? book.rating.toFixed(1) : 'N/A'}</span>
                        </div>
                        <p class="text-slate-700 text-sm mb-2 line-clamp-3">${book.description}</p>
                        <div class="flex justify-between text-xs text-slate-500">
                            <span><i class="fas fa-book-open mr-1"></i>${book.pages || '—'} pages</span>
                            <span><i class="fas fa-tags mr-1"></i>${book.genre || 'General'}</span>
                        </div>
                    </div>
                `;
        container.appendChild(card);
    });
}

function resetForm() {
    document.getElementById('recommendationForm').reset();
    currentStep = 1;
    userData = {
        selectedGenres: [],
        selectedAuthors: [],
        selectedBooks: []
    };
    updateSelectedAuthors();
    updateSelectedBooks();
    populateGenres();
    showStep(currentStep);
}
