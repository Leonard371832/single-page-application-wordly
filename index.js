
// Getting HTML elements 

const searchForm = document.getElementById("search-form");
const wordInput = document.getElementById("word-input");
const searchButton = document.getElementById("search-button");
const statusMessage = document.getElementById("status-message");
const wordResult = document.getElementById("word-result");
const themeToggle = document.getElementById("theme-toggle");
const favoritesList = document.getElementById("favorites-list");
const favoritesCount = document.getElementById("favorites-count");


// Load saved favorites from local storage
let favorites = [];

try {
    const savedFavorites = JSON.parse (
        localStorage.getItem("wordly-favorites")

    );

    favorites = Array.isArray(savedFavorites)           // This validates that favorites are an array and filters out entries without a valid word.
        ? savedFavorites.filter(
            item => item && typeof item.word === "string"
        ) 
        : [];
} catch (error) {
    favorites = [];
}

// SHow status message
function showStatus(message, type = "") {
    statusMessage.textContent = message;
    statusMessage.className = type;
}

// Creating HTML elements 
function createElement(tag, className, text = "") {
    const element = document.createElement(tag);

    if (className) {
        element.className = className;
    }

    element.textContent = text;
    return element;
} 

// Search for a word when the form is submitted 
searchForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const word = wordInput.value.trim();

    if (!word) {
        showStatus("PLease enter a word to search.", "error");
        return;
    }

    searchButton.disabled = true;
    showStatus("Searching for your word...");
    wordResult.replaceChildren();

    try {
        const response = await fetch(
            `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`
        );

        if (!response.ok) {
            throw new Error("Word not found");
        }

        const data = await response.json();

        if (!Array.isArray(data) || data.length === 0) {
            throw new Error("Word not found"); 
        }

        const entry = data[0];

        displayWord(entry);
        showStatus(`Found the meaning of "${entry.word}".`, "success");

    } catch (error) {
        wordResult.replaceChildren();

        if (error.message === "Word not found") {
            showStatus(
                   "Sorry we couldn't find that word. Check the spelling and try again.",
                    "error"
        );
        } else {                                    // This assumes other network or request errors are not deliberately thrown with the message "Word not found".
            showStatus(
                "Unable to load the dictionary. Check your internet", "error"
            );
        }
        
    } finally {
        searchButton.disabled = false;
    }

});


// Display the dictionary result 
function displayWord(entry) {
    wordResult.replaceChildren();

    const card = createElement("article", "word-card");

    // Word heading 
    const header = createElement("div", "word-header");
    const wordInfo = createElement("div");

    const title = createElement("h2", "word-title", entry.word);
    
    const phoneticText = entry.phonetic || (entry.phonetics || []).find(item => item.text)?.text || "";

    const phonetic = createElement("p", "phonetic", phoneticText);
    
    wordInfo.append(title, phonetic);

    // Pronunciation and favorite button
    const actions = createElement("div", "word-actions");

    const audioItem = (entry.phonetics || []).find(item => item.audio && item.audio.trim() !== "");

    if (audioItem) {
        const audioButton = createElement(
            "button", "icon-button", "🔊 Listen" 
        );

        audioButton.type = "button";

        audioButton.addEventListener("click", async function () {
            try{
                const audioUrl = audioItem.audio.startsWith("//")
                     ? `https:${audioItem.audio}`
                     : audioItem.audio.startsWith("/")
                        ? `https://api.dictionaryapi.dev${audioItem.audio}`
                        : audioItem.audio;

                console.log("Pronunciation audio URL:", audioUrl);                    // Try playing the dictionary API audio first.

                const audio = new Audio(audioUrl);

                await audio.play();

                showStatus("Playing pronunciation...", "success");

            } catch (error) {

                console.error("Dictionary audio failed:", error);            


                if ("speechSynthesis" in window) {                      // If the audio fails, use the browser's speech synthesis to pronounce the word instead.

                    window.speechSynthesis.cancel();
                    
                    const utterance = new SpeechSynthesisUtterance(entry.word);        
                    utterance.lang = "en-GB";

                    utterance.onstart = function () {
                        showStatus("Playing browser pronunciation...", "success"); 
                    };

                    utterance.onerror = function () {
                        showStatus("Pronunciation is unavailable right now.", "error"); 
                    };

                    window.speechSynthesis.speak(utterance); 
                } else {
                    showStatus("Pronunciation is available right now.", "error");
                }

            }
        });
       

        actions.appendChild(audioButton);
    }

    const favoriteButton = createElement(
        "button", "icon-button", isFavorite(entry.word) ? "♥ Saved" : "♡ Save word"
    );

    favoriteButton.type = "button";

    if (isFavorite(entry.word)) {
        favoriteButton.classList.add("favorite-active");
    }

    favoriteButton.addEventListener("click", function () {
        toggleFavorite(entry);
        
        favoriteButton.textContent = isFavorite(entry.word)
              ? "♥ Saved"
              : "♡ Save word";

        favoriteButton.classList.toggle(
              "favorite-active",
              isFavorite(entry.word)
        );
    });

    actions.appendChild(favoriteButton);
    header.append(wordInfo, actions);
    card.appendChild(header);

    // Display meanings and definitions 
    (entry.meanings || []).forEach(function (meaning) {
        const meaningSection = createElement(
            "section", 
            "meaning-section"
        );

        const partOfSpeech = createElement(
            "p", 
            "part-of-speech", 
            meaning.partOfSpeech
        ); 

        const definitionList =createElement(
            "ol",
            "definition-list" 
        );


        (meaning.definitions || []).forEach(function (item) {
            const listItem = createElement("li", "", item.definition);

            if (item.example) {
                const example = createElement(
                    "span",
                    "example",
                    item.example
                );

                listItem.appendChild(example);
            }

            definitionList.appendChild(listItem);
        });

        meaningSection.append(partOfSpeech, definitionList);

        // Display synonyms
        const synonyms = meaning.synonyms || [];

        if (synonyms.length > 0) {
            const label = createElement(
                "p",
                "detail-label",
                "Synonyms"
            );

            const tags = createElement("div", "word-tags");

            synonyms.slice(0, 10).forEach(function (word) {
                tags.appendChild(
                    createElement("span", "word-tag", word)
                );
            });

            meaningSection.append(label, tags);
        
        }

        // Display antonyms 
        const antonyms = meaning.antonyms || [];

        if (antonyms.length > 0) {
            const label = createElement(
                "p",
                "detail-label",
                "Antonyms"
            );

            const tags = createElement("div", "word-tags");

            antonyms.slice(0, 10).forEach(function (word) {
                tags.appendChild(
                    createElement("span", "word-tag", word)
                );
            });

            meaningSection.append(label, tags);
        }

        card.appendChild(meaningSection);
    });

    // Display word origin

    if (entry.origin) {
        const originLabel = createElement(
            "p", "detail-label", "Word origin"
        );

        const origin = createElement("p", "", entry.origin);

        card.append(originLabel, origin);
    }
    
    // Link to the dictionary source 
    const sourceLink = createElement(
        "a", "source-link", "View dictionary source"
    );
    
    sourceLink.href = 
          `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(entry.word)}`;

    sourceLink.target = "_blank";
    sourceLink.rel = "noopener noreferrer";

    card.appendChild(sourceLink);
    wordResult.appendChild(card);

}    
 

// CHeck whether a word is already a favorite 
function isFavorite(word) {
    return favorites.some(
        item => item.word.toLowerCase() === word.toLowerCase()
    );
}

            
// Add or remove a favorite word
function toggleFavorite(entry) {
    if (isFavorite(entry.word)) {
        favorites = favorites.filter(
            item => item.word.toLowerCase() !== entry.word.toLowerCase()
        );

        showStatus(
            `Removed "${entry.word}" from favorites`, "success"
        );
    } else {
        favorites.push({
            word: entry.word, 
            phonetic: 
                    entry.phonetic || 
                    (entry.phonetics || []).find(item => item.text)?.text || ""

        });

        showStatus(
            `Saved "${entry.word}" to favorites.`, "success"
        );
    }

     saveFavorites();
     displayFavorites();

}

// Save favorites in the browser 
function saveFavorites() {
    try {
        localStorage.setItem(
            "wordly-favorites", 
            JSON.stringify(favorites) 
        );
    } catch (error) {
        showStatus(
            "Unable to save favorites in this browser.", "error"
        );
    }
}  

// Display favorite words 
function displayFavorites() {
    favoritesList.replaceChildren();

    favoritesCount.textContent = `${favorites.length} saved`;

    if (favorites.length === 0) {
        favoritesList.appendChild(
            createElement(
                "p", "empty-message", "Your saved words will appear here."
            )
        );

        return;
    }

    favorites.forEach(function (item) {
        const card = createElement("article", "favorite-card");
        
        const word = createElement("p", "favorite-word", item.word);

        const phonetic = createElement(
            "p", "favorite-phonetic", item.phonetic
        );

        word.addEventListener("click", function () {

            wordInput.value = item.word; 
            searchForm.requestSubmit();
            
        });

        const actions = createElement("div", "favorite-actions");

        const viewButton = createElement(
            "button", "icon-button", "View meaning"
        );

        viewButton.type = "button";

        viewButton.addEventListener("click", function () {
            wordInput.value = item.word;
            searchForm.requestSubmit();
        });

        const removeButton = createElement(
            "button", "icon-button", "Remove"
        );

        removeButton.type = "button";

        removeButton.addEventListener("click", function () {
            favorites = favorites.filter(
                favorite => 
                   favorite.word.toLowerCase() !== item.word.toLowerCase() 
            );

            saveFavorites();
            displayFavorites();

            showStatus(
                `Removed "${item.word}" from favorites.`, "success"
            );

        });

        actions.append(viewButton, removeButton); 
        card.append(word, phonetic, actions);
        favoritesList.appendChild(card);      

    });
} 

// Toogle between light and dark themes 
themeToggle.addEventListener("click", function () {
    document.body.classList.toggle("dark-theme");

    const darkMode = document.body.classList.contains("dark-theme");

    themeToggle.textContent = darkMode
            ? "☀️ Light mode"
        : "🌚 Dark mode";

    try{
        localStorage.setItem(
        "wordly-theme",
        darkMode ? "dark" : "light"

    );
    } catch (error) {                     // The theme can still change visually even if the browser cannot save the preference.
        showStatus(
            "Unable to save the theme preference.", "error"
        );
    }

});

// Restore the save theme when the page opens 
try {
    const savedTheme = localStorage.getItem("wordly-theme");
    
    if (savedTheme === "dark") {
        document.body.classList.add("dark-theme");
        themeToggle.textContent = "☀️ Light mode";
    }
} catch (error) {
    // Continue using the default light if theme is not available

}

// Display saved favorites when the page opens 
displayFavorites();




