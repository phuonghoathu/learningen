let mediaRecorder;
let audioChunks = [];
let audioBlob;

// Biến lưu HTML mô tả cho preview
let lastDescHtml = '';

document.addEventListener("DOMContentLoaded", () => {
    fetch('/get-sessions?type=word')
        .then(response => {
            if (response.status === 401) {
                showLoginPopup();
            } else {
                return response.json();
            }
        })
        .then(data => {
            const dropdown = document.getElementById('sessionDropdown');
            console.log(data)
            data.sessions.forEach(ss => {
                const option = document.createElement('option');
                option.value = ss.session_encode;
                option.text = ss.session;
                dropdown.add(option);
            });
            const addOption = document.createElement('option');
            addOption.value = 'add-session';
            addOption.text = 'Add Session';
            dropdown.add(addOption);
        });

    document.getElementById('sessionDropdown').addEventListener('change', (event) => {
        if (event.target.value === 'add-session') {
            openPopup();
        }
    });

    // Function to handle clicks on the "Edit" and "Delete" buttons
    document.querySelector('.word-list tbody').addEventListener('click', function (event) {
        if (event.target.classList.contains('edit')) {
            const row = event.target.closest('tr');
            const english = row.children[0].textContent;
            const vietnamese = row.children[1].textContent;
            const id = row.children[2].textContent;
            //english, vietnamese, id, level, description, imageUrl
            openEditPopup(english, vietnamese, id, row.children[3].textContent
                ,row.children[5].querySelector('.tooltiptext')?row.children[5].querySelector('.tooltiptext').textContent:"",
                row.children[4].querySelector('img')?row.children[4].querySelector('img').getAttribute('alt'):"",row);
        } else if (event.target.classList.contains('delete')) {
            const row = event.target.closest('tr');
            const english = row.children[0].textContent;
            const vietnamese = row.children[1].textContent;
            const id = row.children[2].textContent;
            deleteWord(id, row);
        }
    });
});


function openPopup() {
    document.getElementById('sessionPopup').style.display = 'block';
}

function closePopup() {
    document.getElementById('sessionPopup').style.display = 'none';
}


function getQuizLink() {
    copySessionDropdownOptions('modalSessionLearningDropdown');
    const myLink = document.getElementById('learningLinkPopup');
    myLink.style.top = 'center';
    myLink.style.left = 'center';
    myLink.style.display = 'block';
}
function closePopup_getLearninglink() {
    document.getElementById('learningLinkPopup').style.display = 'none';
}

function closePopup_quizlink() {
    document.getElementById('quizLinkPopup').style.display = 'none';
}

function openPopup_quizlink(url, passcode) {
    document.getElementById('quizLinkPopup').style.display = 'block';
    const yourQuizLink = document.getElementById('yourQuizLink');
    const yourPass = document.getElementById('yourPass');

    yourQuizLink.textContent = "Quiz URL : " + url;
    yourPass.textContent = "Quiz pass code : " + passcode;
}

function copySessionDropdownOptions(idTo = 'modalSessionDropdown') {
    const sessionDropdown = document.getElementById('sessionDropdown');
    const modalSessionDropdown = document.getElementById(idTo);
    modalSessionDropdown.innerHTML = '';

    Array.from(sessionDropdown.options).forEach(option => {
        const newOption = document.createElement('option');
        if(option.value == 'add-session') {
            if(idTo == 'modalSessionDropdown') {
                newOption.value = 'all';
                newOption.text = "All";
                modalSessionDropdown.appendChild(newOption);
            }
        } else {
            newOption.value = option.value;
            newOption.text = option.text;
            modalSessionDropdown.appendChild(newOption);
        }
    });
    
    modalSessionDropdown.value = sessionDropdown.value
    modalSessionDropdown.text = sessionDropdown.text
}

function addWord() {
    const english = document.getElementById('english').value;
    const vietnamese = document.getElementById('vietnamese').value;
    const session = document.getElementById('sessionDropdown').value;
    const level = document.getElementById('level').value;
    const description = document.getElementById('description').value;
    const imageUpload = document.getElementById('imageUpload').files[0];

    const formData = new FormData();
    formData.append('english', english);
    formData.append('vietnamese', vietnamese);
    formData.append('session', session);
    formData.append('level', level);
    formData.append('description', description);
    if (imageUpload) {
        formData.append('image', imageUpload, `${session}_${english}.jpg`);
    }
    if(audioBlob) {
        formData.append('audio', audioBlob, 'audio.wav');
    }

    fetch('/add-word', {
        method: 'POST',
        body: formData
    }).then(response => response.json())
        .then(data => {
            if (data.success) {
                toastr.success('Từ mới đã được thêm!');
                // Clear the input fields
                document.getElementById('english').value = '';
                document.getElementById('vietnamese').value = '';
                document.getElementById('description').value = '';
                document.getElementById('imageUpload').value = '';
                document.getElementById('level').value = 'medium';
                // Hide desc-html-preview sau khi thêm từ
                var previewDiv = document.getElementById('desc-html-preview');
                if (previewDiv) previewDiv.style.display = 'none';
            } else {
                toastr.error('Có lỗi xảy ra, vui lòng thử lại!');
            }
        });
}

function saveSession() {
    const newSessionName = document.getElementById('newSessionName').value;
    fetch('/add-session', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ session: newSessionName, type:'word' })
    }).then(response => response.json())
        .then(data => {
            if (data.success) {
                toastr.success('Section mới đã được thêm!');
                const dropdown = document.getElementById('sessionDropdown');
                const option = document.createElement('option');
                option.value = data.session_encode;
                option.text = newSessionName;
                dropdown.add(option, dropdown.length - 1);
                dropdown.value = data.session_encode;
                closePopup();
            } else {
                toastr.error('Có lỗi xảy ra, vui lòng thử lại!');
            }
        });
}

function searchWords() {
    const selectedSession = document.getElementById('sessionDropdown').value;
    if (selectedSession === 'add-session') {
        toastr.error('Vui lòng chọn một section hợp lệ để tìm kiếm.');
        return;
    }

    fetch(`/search-words?keyw=${encodeURIComponent(selectedSession)}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const wordListBody = document.querySelector('.word-list tbody');
                wordListBody.innerHTML = ''; // Clear existing rows

                data.words.forEach(word => {
                    const row = document.createElement('tr');
                    const englishCell = document.createElement('td');
                    const vietnameseCell = document.createElement('td');
                    const word_id = document.createElement('td');
                    const hardLevelCell = document.createElement('td');
                    const imageCell = document.createElement('td');
                    const audioCell = document.createElement('td');
                    const descriptionCell = document.createElement('td');
                    const actionsCell = document.createElement('td');

                    englishCell.textContent = word.english;
                    vietnameseCell.textContent = word.vietnamese;
                    hardLevelCell.textContent = word.level;

                    // Handle description with tooltip
                    const descriptionDiv = document.createElement('div');
                    descriptionDiv.className = 'tooltip';
                    descriptionDiv.textContent = word.description.length > 20 ? word.description.substring(0, 20) + '...' : word.description;
                    const tooltipSpan = document.createElement('span');
                    tooltipSpan.className = 'tooltiptext';
                    tooltipSpan.textContent = word.description;
                    descriptionDiv.appendChild(tooltipSpan);
                    descriptionCell.appendChild(descriptionDiv);

                    // Handle image display with popup
                    if (word.imageUrl) {
                        const imgIcon = document.createElement('img');
                        imgIcon.src = '/uploads/icon/view.png'; // Replace with your icon path
                        imgIcon.alt = `/uploads/${word.imageUrl}`;
                        imgIcon.style.cursor = 'pointer';
                        imgIcon.onclick = () => {
                            const imgPopup = document.createElement('img');
                            imgPopup.src = `/uploads/${word.imageUrl}`;
                            imgPopup.style.maxWidth = '100%';
                            imgPopup.style.maxHeight = '100%';
                            imgPopup.style.border = '3px solid rebeccapurple';
                            imgPopup.style.padding= '4px';

                            const popupDiv = document.createElement('div');
                            popupDiv.style.position = 'fixed';
                            popupDiv.style.top = 'center';
                            popupDiv.style.left = 'center';
                            popupDiv.style.width = '400px';
                            popupDiv.style.height = '500px';
                            popupDiv.style.display = 'flex';
                            popupDiv.style.alignItems = 'center';
                            popupDiv.style.justifyContent = 'center';
                            popupDiv.style.cursor = 'pointer';
                            popupDiv.onclick = () => {
                                document.body.removeChild(popupDiv);
                            };

                            popupDiv.appendChild(imgPopup);
                            document.body.appendChild(popupDiv);
                        };
                        imageCell.appendChild(imgIcon);
                    }

                    word_id.textContent = word.id
                    word_id.hidden = true
                    actionsCell.innerHTML = '<button class="edit">Sửa</button><button class="delete">Xóa</button>';

                    if(word.audio) {
                        const playIcon = document.createElement('i');
                        playIcon.classList.add('fas', 'fa-play-circle', 'icon-button');
                        playIcon.addEventListener('click', () => {
                            const audio = new Audio(`/uploads/${word.audio}`);
                            audio.play();
                        });
                        audioCell.appendChild(playIcon);
                    }

                    row.appendChild(englishCell);
                    row.appendChild(vietnameseCell);
                    row.appendChild(word_id);
                    row.appendChild(hardLevelCell);
                    row.appendChild(imageCell);
                    row.appendChild(audioCell);
                    row.appendChild(descriptionCell);
                    row.appendChild(actionsCell);

                    wordListBody.appendChild(row);
                });
            } else {
                toastr.infor('Không tìm thấy từ nào cho section này.');
            }
        });
}

function getLeaningLink() {
    const myLinkInfo = document.getElementById('yourLearingLink');
    myLinkInfo.textContent = "Your link is " + "http://localhost:3000/student/" + "learning.html?data=" + document.getElementById('modalSessionLearningDropdown').value
}
function getLink() {
    copySessionDropdownOptions();
    var date = new Date();
    const myLink = document.getElementById('myModal_gen_link');
    document.getElementById('quizName').value = date.getFullYear().toString() + pad2(date.getMonth() + 1) 
                        + pad2( date.getDate()) + "/" +pad2( date.getHours() ) 
                        + pad2( date.getMinutes() ) + pad2( date.getSeconds() );
    myLink.style.top = 'center';
    myLink.style.left = 'center';
    myLink.style.display = 'block';
}

function closePopup_getlink() {
    document.getElementById('myModal_gen_link').style.display = 'none';
}


function createLink() {
    
    const quizName = document.getElementById('quizName').value;
    const session = document.getElementById('modalSessionDropdown').value;
    const numberQuestion = document.getElementById('numberQuestion').value;

    const hard = document.getElementById('numberQuestionLevelHard').value;
    const medium = document.getElementById('numberQuestionLevelMedium').value;
    const easy = document.getElementById('numberQuestionLevelEasy').value;

    const type = document.getElementById('type').value;
    const time = document.getElementById('time').value;
    const tryAgainTimes = document.getElementById('tryAgainTimes').value;
    
    const wrongMinusScoreHard = document.getElementById('wrongMinusLevelHard').value;
    const wrongMinusScoreMedium = document.getElementById('wrongMinusLevelMedium').value;
    const wrongMinusScoreEasy = document.getElementById('wrongMinusLevelEasy').value;

    const rightPlusScoreHard = document.getElementById('rightPlusLevelHard').value;
    console.log('rightPlusScoreHard')
    console.log(rightPlusScoreHard)
    const rightPlusScoreMedium = document.getElementById('rightPlusLevelMedium').value;
    const rightPlusScoreEasy = document.getElementById('rightPlusLevelEasy').value;

    const skipMinusScoreHard = document.getElementById('skipMinusLevelHard').value;
    const skipMinusScoreMedium = document.getElementById('skipMinusLevelMedium').value;
    const skipMinusScoreEasy = document.getElementById('skipMinusLevelEasy').value;

    const hintMinusScoreHard = document.getElementById('hintMinusLevelHard').value;
    const hintMinusScoreMedium = document.getElementById('hintMinusLevelHedium').value;
    const hintMinusScoreEasy = document.getElementById('hintMinusLevelEasy').value;

    const skip = document.getElementById('skip').checked;
    const hint = document.getElementById('hint').checked;
    const maxHint = document.getElementById('maxHit').value;
    const correctCheck = document.getElementById('correctCheck').checked;
    const correctDisplay = document.getElementById('correctDisplay').checked;
  //  const randomCode = genRand(8);

    /* Kiểm tra xem có ít nhất một trường trong các trường hard, medium, hoặc easy được nhập hay không
    const isAnyQuestionSet = hard || medium || easy;

    // Nếu có ít nhất một trường được nhập mà numberQuestion lại không được nhập
    if (isAnyQuestionSet && !numberQuestion) {
        toastr.error('Vui lòng nhập số câu hỏi (Number Question) nếu bạn đã nhập bất kỳ số lượng câu hỏi nào nào.');
        return;
    }*/

    const data = {
        quizName,
        session,
        numberQuestion,
        hard,
        medium,
        easy,
        type,
        time,
        tryAgainTimes,
        wrongMinusScore: { hard: wrongMinusScoreHard, medium: wrongMinusScoreMedium, easy: wrongMinusScoreEasy },
        rightPlusScore: { hard: rightPlusScoreHard, medium: rightPlusScoreMedium, easy: rightPlusScoreEasy },
        skipMinusScore: { hard: skipMinusScoreHard, medium: skipMinusScoreMedium, easy: skipMinusScoreEasy },
        hintMinusScore: { hard: hintMinusScoreHard, medium: hintMinusScoreMedium, easy: hintMinusScoreEasy },
        skip,
        hint,
        maxHint,
        correctCheck,
        correctDisplay
        //randomCode
    };

    fetch('/create-url', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            // Display the created URL or do something with it
            closePopup_getlink();
            openPopup_quizlink(result.url, result.randomCode);
           // alert('Created URL:' +  result.url + " Code: " + randomCode);
        } else {
            // Handle error
            console.error('Error creating URL:', result.message);
        }
    });
}

function closeEditPopup(element) {
    const popup = element.closest('.popup');
    document.body.removeChild(popup);
}

function openEditPopup(english, vietnamese, id, level, description, imageUrl) {
    const editPopup = document.createElement('div');
    editPopup.classList.add('popup');
    console.log(description)
    editPopup.innerHTML = `
        <div class="popup-content">
            <span class="close" onclick="closeEditPopup(this)">&times;</span>
            <h2>Chỉnh sửa từ</h2>
            <input type="text" id="editEnglish" value="${english}">
            <input type="text" id="editVietnamese" value="${vietnamese}">
            <br/>
            <select id="editLevel">
                <option value="Easy" ${level === 'Easy' ? 'selected' : ''}>Easy</option>
                <option value="Medium" ${level === 'Medium' ? 'selected' : ''}>Medium</option>
                <option value="Hard" ${level === 'Hard' ? 'selected' : ''}>Hard</option>
            </select>
            <input type="file" id="editImage">
            ${imageUrl ? `<br/><img src="${imageUrl}" alt="Image" style="max-width: 100px; max-height: 100px;">` : ''}
            <br/>
            <textarea id="editDescription">${description}</textarea>
            <br/>
            
            <button id="buttonEditWord" onclick="saveEditWord('${id}', this)">Save</button>
        </div>
    `;
    document.body.appendChild(editPopup);
    editPopup.style.display = 'block';
}

function saveEditWord( id, button) {
    const newEnglish = document.getElementById('editEnglish').value;
    const newVietnamese = document.getElementById('editVietnamese').value;
    const newLevel = document.getElementById('editLevel').value;
    const newDescription = document.getElementById('editDescription').value;
    const newImageFile = document.getElementById('editImage').files[0];
    const session = document.getElementById('sessionDropdown').value;

    


    const formData = new FormData();
    formData.append('id', id);
    formData.append('newEnglish', newEnglish);
    formData.append('newVietnamese', newVietnamese);
    formData.append('newLevel', newLevel);
    formData.append('newDescription', newDescription);
    formData.append('english', newEnglish);
    formData.append('session', session);
    if (newImageFile) {
        formData.append('newImage', newImageFile);
    }

    fetch('/edit-word', {
        method: 'POST',
        body: formData
    }).then(response => response.json())
        .then(data => {
            if (data.success) {
                toastr.success('Từ đã được cập nhật!');
                searchWords();
                closeEditPopup(button);
            } else {
                toastr.error('Có lỗi xảy ra, vui lòng thử lại!');
            }
        });
}

function deleteWord(id, row) {
    fetch('/delete-word', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id })
    }).then(response => response.json())
        .then(data => {
            if (data.success) {
                toastr.success('Từ đã được xóa!');
                row.remove();
            } else {
                toastr.error('Có lỗi xảy ra, vui lòng thử lại!');
            }
        });
}

document.getElementById('start-recording').addEventListener('click', async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.start();

    mediaRecorder.addEventListener('dataavailable', event => {
        audioChunks.push(event.data);
    });

    mediaRecorder.addEventListener('stop', () => {
        audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        document.getElementById('audio-playback').src = audioUrl;

        audioChunks = [];
        document.getElementById('upload-recording').disabled = false;
    });

    document.getElementById('start-recording').disabled = true;
    document.getElementById('stop-recording').disabled = false;
});

function pad2(n) { return n < 10 ? '0' + n : n }

document.getElementById('stop-recording').addEventListener('click', () => {
    mediaRecorder.stop();
    document.getElementById('start-recording').disabled = false;
    document.getElementById('stop-recording').disabled = true;
});

// === TỰ ĐỘNG LẤY NGHĨA, PHIÊN ÂM, AUDIO, HÌNH ẢNH ===
document.addEventListener('DOMContentLoaded', () => {
    // ...existing code...
    // Thêm sự kiện cho input tiếng Anh
    const englishInput = document.getElementById('english');
    if (englishInput) {
        let lastValue = '';
        let debounceTimeout;
        englishInput.addEventListener('input', function () {
            clearTimeout(debounceTimeout);
            const value = this.value.trim();
            if (!value || value === lastValue) return;
            debounceTimeout = setTimeout(() => {
                lastValue = value;
            }, 600);
        });
        englishInput.addEventListener('blur', function () {
            const value = this.value.trim();
            if (value) fetchWordInfo(value);
        });
    }
});

async function fetchWordInfo(word) {
    // 1. Lấy nghĩa tiếng Việt và phiên âm từ dictionaryapi.dev
    try {
        const dictRes = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
        if (!dictRes.ok) return;
        const dictData = await dictRes.json();
        if (Array.isArray(dictData) && dictData.length > 0) {
            // Nghĩa tiếng Việt (dùng Google Translate API free qua proxy backend nếu muốn chính xác hơn)
            const vietnamese = await fetchGoogleTranslate(word, 'en', 'vi');
            if (vietnamese) {
                document.getElementById('vietnamese').value = vietnamese;
            }
            // Phiên âm
            const phonetic = dictData[0].phonetic || (dictData[0].phonetics && dictData[0].phonetics[0] && dictData[0].phonetics[0].text);
            // Audio: lấy audio đầu tiên từ phonetics[0]
            let audioUrl = '';
            if (dictData[0].phonetics && dictData[0].phonetics[0] && dictData[0].phonetics[0].audio) {
                audioUrl = dictData[0].phonetics[0].audio;
            } else if (dictData[0].phonetics && dictData[0].phonetics.find(p => p.audio)) {
                audioUrl = dictData[0].phonetics.find(p => p.audio).audio;
            }
            if (audioUrl) {
                fetch(audioUrl)
                    .then(r => r.blob())
                    .then(b => { audioBlob = b; document.getElementById('audio-playback').src = URL.createObjectURL(b); });
            }
            // Mô tả chi tiết (HTML)
            let descHtml = '<ul style="text-align:left">';
            if (phonetic) descHtml += `<li><b>Phiên âm:</b> ${phonetic}</li>`;
            if (dictData[0].meanings && dictData[0].meanings.length > 0) {
                dictData[0].meanings.forEach(meaning => {
                    if (meaning.partOfSpeech) descHtml += `<li><b>Loại:</b> <i>${meaning.partOfSpeech}</i><ul>`;
                    if (meaning.definitions && meaning.definitions.length > 0) {
                        meaning.definitions.forEach((def, idx) => {
                            if (def.definition) descHtml += `<li><b>Meaning ${idx+1}:</b> ${def.definition}`;
                            let hasList = false;
                            if (def.antonyms && def.antonyms.length > 0) {
                                descHtml += '<ul><li><b>Từ trái nghĩa:</b> ' + def.antonyms.join(', ') + '</li>';
                                hasList = true;
                            }
                            if (def.synonyms && def.synonyms.length > 0) {
                                if (!hasList) descHtml += '<ul>';
                                descHtml += '<li><b>Từ đồng nghĩa:</b> ' + def.synonyms.join(', ') + '</li>';
                                hasList = true;
                            }
                            if (hasList) descHtml += '</ul>';
                            descHtml += '</li>';
                        });
                    }
                    if (meaning.partOfSpeech) descHtml += '</ul></li>';
                });
            }
            descHtml += '</ul>';
            lastDescHtml = descHtml;
            document.getElementById('description').value = descHtml;//.replace(/<[^>]+>/g, '').replace(/\n/g, ' ');
        }
    } catch (e) { }
    // 2. Lấy hình ảnh từ Unsplash API (lấy 10 hình, cho người dùng chọn)
    try {
        const imgRes = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(word)}&client_id=9HrIFVgZ1a7L_IuxEFRtclrLUqBXJx5HE4dWT7QUMoI&per_page=10`);
        if (imgRes.ok) {
            const imgData = await imgRes.json();
            if (imgData.results && imgData.results.length > 0) {
                // Xóa vùng chọn cũ nếu có
                let imgSelectDiv = document.getElementById('img-select-div');
                if (imgSelectDiv) imgSelectDiv.remove();
                imgSelectDiv = document.createElement('div');
                imgSelectDiv.id = 'img-select-div';
                imgSelectDiv.style.display = 'flex';
                imgSelectDiv.style.gap = '8px';
                imgSelectDiv.style.flexWrap = 'wrap';
                imgSelectDiv.style.margin = '8px 0';
                imgSelectDiv.innerHTML = '<b>Chọn hình ảnh:</b>';
                imgData.results.forEach((img, idx) => {
                    const imgEl = document.createElement('img');
                    imgEl.src = img.urls.small;
                    imgEl.style.maxWidth = '80px';
                    imgEl.style.maxHeight = '80px';
                    imgEl.style.cursor = 'pointer';
                    imgEl.style.border = '2px solid #ccc';
                    imgEl.title = 'Chọn hình này';
                    imgEl.onclick = async function(e) {
                        // Đánh dấu hình đã chọn
                        Array.from(imgSelectDiv.querySelectorAll('img')).forEach(i => i.style.border = '2px solid #ccc');
                        imgEl.style.border = '3px solid #007bff';
                        // Tải file ảnh về và gán vào input file
                        const b = await fetch(img.urls.small).then(r => r.blob());
                        const file = new File([b], `${word}_${idx}.jpg`, { type: b.type });
                        const dataTransfer = new DataTransfer();
                        dataTransfer.items.add(file);
                        document.getElementById('imageUpload').files = dataTransfer.files;
                    };
                    // Modal xem lớn khi click chuột phải hoặc double click
                    imgEl.addEventListener('dblclick', function(e) {
                        e.preventDefault();
                        showImageModal(img.urls.regular);
                    });
                    imgEl.addEventListener('contextmenu', function(e) {
                        e.preventDefault();
                        showImageModal(img.urls.regular);
                    });
                    imgSelectDiv.appendChild(imgEl);
                });
                // Thêm vùng chọn vào TRƯỚC vùng recording (trước Start Recording)
                const audioPlayback = document.getElementById('audio-playback');
                if (audioPlayback) {
                    const recordingDiv = audioPlayback.closest('div');
                    if (recordingDiv) {
                        // Xóa vùng chọn cũ nếu có
                        const parent = recordingDiv.parentNode;
                        const oldImgDiv = document.getElementById('img-select-div');
                        if (oldImgDiv && oldImgDiv.parentNode === parent) {
                            parent.removeChild(oldImgDiv);
                        }
                        parent.insertBefore(imgSelectDiv, recordingDiv);
                    }
                } else {
                    // fallback: vẫn thêm dưới imageUpload nếu không tìm thấy audio-playback
                    const uploadParent = document.getElementById('imageUpload').parentNode;
                    uploadParent.appendChild(imgSelectDiv);
                }
            }
        }
    } catch (e) { }
}

// Modal xem hình lớn
function showImageModal(url) {
    let modal = document.getElementById('img-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'img-modal';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100vw';
        modal.style.height = '100vh';
        modal.style.background = 'rgba(0,0,0,0.7)';
        modal.style.display = 'flex';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        modal.style.zIndex = '9999';
        modal.onclick = function() { modal.remove(); };
        document.body.appendChild(modal);
    } else {
        modal.innerHTML = '';
        modal.style.display = 'flex';
    }
    const img = document.createElement('img');
    img.src = url;
    img.style.maxWidth = '90vw';
    img.style.maxHeight = '90vh';
    img.style.border = '4px solid #fff';
    modal.innerHTML = '';
    modal.appendChild(img);
}

// Hàm dịch nghĩa tiếng Việt sử dụng Google Translate API free qua proxy (nếu muốn chính xác hơn)
async function fetchGoogleTranslate(text, source, target) {
    try {
        const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${source}&tl=${target}&dt=t&q=${encodeURIComponent(text)}`);
        if (!res.ok) return '';
        const data = await res.json();
        return data[0][0][0];
    } catch (e) { return ''; }
}

// Thêm nút Preview bên cạnh ô mô tả
function addPreviewButton() {
    const descInput = document.getElementById('description');
    if (!descInput) return;
    let btn = document.getElementById('btn-preview-desc');
    if (!btn) {
        btn = document.createElement('button');
        btn.id = 'btn-preview-desc';
        btn.type = 'button';
        btn.textContent = 'Preview';
        btn.style.marginLeft = '8px';
        btn.onclick = function() {
            showDescModal(lastDescHtml);
        };
        descInput.parentNode.insertBefore(btn, descInput.nextSibling);
    }
}

// Modal/popup hiển thị mô tả HTML
function showDescModal(html) {
    let modal = document.getElementById('desc-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'desc-modal';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100vw';
        modal.style.height = '100vh';
        modal.style.background = 'rgba(0,0,0,0.7)';
        modal.style.display = 'flex';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        modal.style.zIndex = '9999';
        modal.onclick = function() { modal.remove(); };
        document.body.appendChild(modal);
    }
    modal.innerHTML = `<div style='background:#fff;padding:24px;max-width:600px;max-height:80vh;overflow:auto;border-radius:8px;position:relative;'>
        <span style='position:absolute;top:8px;right:16px;cursor:pointer;font-size:24px;' onclick='this.closest("#desc-modal").remove()'>&times;</span>
        ${html}
    </div>`;
}

// Hiển thị HTML mô tả cạnh textarea
function renderDescHtmlPreview() {
    let descInput = document.getElementById('description');
    let previewDiv = document.getElementById('desc-html-preview');
    if (!descInput) return;
    if (!previewDiv) {
        previewDiv = document.createElement('div');
        previewDiv.id = 'desc-html-preview';
        previewDiv.style.border = '1px solid #ccc';
        previewDiv.style.marginTop = '8px';
        previewDiv.style.padding = '8px';
        previewDiv.style.background = '#fafbfc';
        descInput.parentNode.insertBefore(previewDiv, descInput.nextSibling.nextSibling);
    }
    previewDiv.innerHTML = lastDescHtml;
}

// Gọi lại khi fetchWordInfo xong hoặc khi nhập textarea
const oldFetchWordInfo = fetchWordInfo;
fetchWordInfo = async function(word) {
    await oldFetchWordInfo(word);
    renderDescHtmlPreview();
}

document.addEventListener('DOMContentLoaded', () => {
    // ...existing code...
    addPreviewButton();
    // Render preview khi load lại trang nếu có mô tả
    setTimeout(renderDescHtmlPreview, 500);
    // Render preview khi sửa textarea thủ công
    const descInput = document.getElementById('description');
    if (descInput) {
        descInput.addEventListener('input', renderDescHtmlPreview);
    }
});


// Chỉ giữ lại 1 phiên bản duy nhất cho searchWords, đảm bảo không bị override và luôn hoạt động đúng
searchWords = function() {
    const selectedSession = document.getElementById('sessionDropdown').value;
    if (selectedSession === 'add-session') {
        toastr.error('Vui lòng chọn một section hợp lệ để tìm kiếm.');
        return;
    }

    fetch(`/search-words?keyw=${encodeURIComponent(selectedSession)}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const wordListBody = document.querySelector('.word-list tbody');
                wordListBody.innerHTML = '';
                data.words.forEach(word => {
                    const row = document.createElement('tr');
                    const englishCell = document.createElement('td');
                    const vietnameseCell = document.createElement('td');
                    const word_id = document.createElement('td');
                    const hardLevelCell = document.createElement('td');
                    const imageCell = document.createElement('td');
                    const audioCell = document.createElement('td');
                    const descriptionCell = document.createElement('td');
                    const actionsCell = document.createElement('td');

                    englishCell.textContent = word.english;
                    vietnameseCell.textContent = word.vietnamese;
                    hardLevelCell.textContent = word.level;

                    // Mô tả: nếu là HTML hoặc dài > 20 ký tự thì chỉ hiện link Details, ngắn thì hiển thị luôn
                    const plainDesc = word.description.replace(/<[^>]+>/g, '').replace(/\n/g, ' ');
                    if (/^\s*<\w+/.test(word.description) || plainDesc.length > 20) {
                        const link = document.createElement('a');
                        link.href = '#';
                        link.textContent = 'Details';
                        link.onclick = function(e) {
                            e.preventDefault();
                            showDescModal(word.description);
                        };
                        descriptionCell.appendChild(link);
                    } else {
                        descriptionCell.textContent = plainDesc;
                    }

                    // Hình ảnh
                    if (word.imageUrl) {
                        const imgIcon = document.createElement('img');
                        imgIcon.src = '/uploads/icon/view.png';
                        imgIcon.alt = `/uploads/${word.imageUrl}`;
                        imgIcon.style.cursor = 'pointer';
                        imgIcon.onclick = () => {
                            // Popup modal cân giữa màn hình
                            const popupDiv = document.createElement('div');
                            popupDiv.style.position = 'fixed';
                            popupDiv.style.top = '0';
                            popupDiv.style.left = '0';
                            popupDiv.style.width = '100vw';
                            popupDiv.style.height = '100vh';
                            popupDiv.style.display = 'flex';
                            popupDiv.style.alignItems = 'center';
                            popupDiv.style.justifyContent = 'center';
                            popupDiv.style.background = 'rgba(0,0,0,0.7)';
                            popupDiv.style.zIndex = '9999';
                            popupDiv.style.cursor = 'pointer';
                            popupDiv.onclick = () => {
                                document.body.removeChild(popupDiv);
                            };

                            const imgPopup = document.createElement('img');
                            imgPopup.src = `/uploads/${word.imageUrl}`;
                            imgPopup.style.maxWidth = '90vw';
                            imgPopup.style.maxHeight = '90vh';
                            imgPopup.style.border = '3px solid rebeccapurple';
                            imgPopup.style.padding= '4px';

                            popupDiv.appendChild(imgPopup);
                            document.body.appendChild(popupDiv);
                        };
                        imageCell.appendChild(imgIcon);
                    }

                    word_id.textContent = word.id;
                    word_id.hidden = true;
                    actionsCell.innerHTML = '<button class="edit">Sửa</button><button class="delete">Xóa</button>';

                    if(word.audio) {
                        const playIcon = document.createElement('i');
                        playIcon.classList.add('fas', 'fa-play-circle', 'icon-button');
                        playIcon.addEventListener('click', () => {
                            const audio = new Audio(`/uploads/${word.audio}`);
                            audio.play();
                        });
                        audioCell.appendChild(playIcon);
                    }

                    row.appendChild(englishCell);
                    row.appendChild(vietnameseCell);
                    row.appendChild(word_id);
                    row.appendChild(hardLevelCell);
                    row.appendChild(imageCell);
                    row.appendChild(audioCell);
                    row.appendChild(descriptionCell);
                    row.appendChild(actionsCell);

                    wordListBody.appendChild(row);
                });
            } else {
                toastr.infor('Không tìm thấy từ nào cho section này.');
            }
        });
}
