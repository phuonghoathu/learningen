document.addEventListener('DOMContentLoaded', () => {
    const flashcard = document.getElementById('flashcard');
    const flashcardInner = flashcard.querySelector('.flashcard-inner');
    const front = flashcard.querySelector('.flashcard-front');
    const back = flashcard.querySelector('.flashcard-back');
    const nextButton = document.getElementById('next-button');
    const prevButton = document.getElementById('prev-button');
    let currentWordIndex = 0;
    let words = [];
    const urlParams = new URLSearchParams(window.location.search);
    const dataUrl = urlParams.get('data');

    flashcard.addEventListener('click', () => {
        flashcard.classList.toggle('is-flipped');
    });

    nextButton.addEventListener('click', () => {
        flashcard.classList.remove('is-flipped');
        flashcard.classList.add('is-next');
        setTimeout(() => {
            currentWordIndex = (currentWordIndex + 1) % words.length;
            displayFlashcard(words[currentWordIndex]);
            flashcard.classList.remove('is-next');
        }, 300);
    });

    prevButton.addEventListener('click', () => {
        flashcard.classList.add('is-prev');
        setTimeout(() => {
            currentWordIndex = (currentWordIndex - 1 + words.length) % words.length;
            displayFlashcard(words[currentWordIndex]);
            flashcard.classList.remove('is-prev');
        }, 300);
    });

    async function fetchWords() {
        try {
            const response = await fetch(`/search-words?keyw=${encodeURIComponent(dataUrl)}`);
            const data = await response.json();
            words = data.words;
            displayFlashcard(words[currentWordIndex]);
        } catch (error) {
            console.error('Error fetching words:', error);
        }
    }

    function displayFlashcard(data) {
        front.innerHTML = '';
        back.innerHTML = data.vietnamese;

        if (data.imageUrl) {
            const img = document.createElement('img');
            img.style.width = '100%';
            img.src = `/uploads/${data.imageUrl}`;
            front.appendChild(img);
        } else {
            front.style.backgroundImage = 'url("/uploads/icon/bg_learning.PNG")'; // Replace with your default background image URL
            front.style.backgroundSize = 'cover';
            front.style.backgroundPosition = 'center';
        }

        const englishWord = document.createElement('div');
        englishWord.textContent = data.english;
        englishWord.style.fontSize = "30px";
        englishWord.style.color = "green"
        front.appendChild(englishWord);

        if (data.audio) {
            const audioIcon = document.createElement('img');
            audioIcon.src = '/uploads/icon/audio-icon.png'; // Replace with your audio icon URL
            audioIcon.alt = 'Audio';
            audioIcon.classList.add('audio-icon');
            audioIcon.addEventListener('click', (e) => {
                e.stopPropagation();
                const audio = new Audio(`/uploads/${data.audio}`);
                audio.play();
            });
            front.appendChild(audioIcon);
        }
    }

    fetchWords();
});