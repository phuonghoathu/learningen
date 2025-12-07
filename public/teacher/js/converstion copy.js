let dataUrl = "";
document.addEventListener("DOMContentLoaded", () => {
    const urlParams = new URLSearchParams(window.location.search);
    dataUrl = urlParams.get('data')?urlParams.get('data'):"";
    if(dataUrl != "") {
        processButton = document.getElementById('processButton');
        processButton.setAttribute("disabled", ""); 
        
        processButton = document.getElementById('saveConvButton');
        processButton.removeAttribute("disabled", ""); 
    }
    fetch('/get-sessions?type=conversion')
        .then(response => {
            if (response.status === 401) {
                showLoginPopup();
            } else {
                return response.json();
            }
        })
        .then(data => {
            const dropdown = document.getElementById('sessionDropdown');
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

            if(dataUrl != "") {
                fetch(`/conv?id=${encodeURIComponent(dataUrl)}`)
                    .then(response => response.json())
                    .then(data => {
                        document.getElementById('conv_name').value = data.convName;

                        // Fill in the textConv
                        document.getElementById('inputText').value = data.textConv;
                
                        // Display convItems
                        // const itemsContainer = $('#convItems');
                        // itemsContainer.empty(); // Clear existing items
                        const tbody = document.getElementById('resultTable').querySelector('tbody');
                        tbody.innerHTML = ''; // Clear existing content
                        
                        data.convItems.forEach(item => {
                            const row = document.createElement('tr');
                            const sentenceCell = document.createElement('td');
                            sentenceCell.textContent = item.sentence;
                            row.appendChild(sentenceCell);

                            const infoCell = document.createElement('td');
                            infoCell.innerHTML = `
                                <button id="startRecording" enabled>Start Recording</button> 
                                <button id="stopRecording" enabled>Stop Recording</button> 
                                <input type="file" class="audio-upload" enabled />
                                <audio controls></audio>`;

                            row.appendChild(infoCell);

                            const actionsCell = document.createElement('td');
                            const submitButton = document.createElement('button');
                            submitButton.textContent = 'Submit';
                            submitButton.disabled = false;
                            submitButton.addEventListener('click', () => {
                                const audioFileInput = row.querySelector('.audio-upload');
                                const formData = new FormData();
                                formData.append('sentence', sentenceCell.textContent);
                                formData.append('audio', audioFileInput.files[0]);
                                formData.append('order', index);

                                fetch('/api/conversationitem', {
                                    method: 'POST',
                                    body: formData
                                })
                                .then(response => response.json())
                                .then(data => {
                                    if (data.success) {
                                        alert('Record saved successfully.');
                                    } else {
                                        alert('Failed to save record.');
                                    }
                                })
                                .catch(error => {
                                    console.error('Error:', error);
                                    alert('Error occurred while saving record.');
                                });
                            });
                            actionsCell.appendChild(submitButton);

                            const deleteButton = document.createElement('button');
                            deleteButton.textContent = 'Delete';
                            deleteButton.addEventListener('click', () => {
                                // call delete API
                            });
                            actionsCell.appendChild(deleteButton);

                            row.appendChild(actionsCell);
                            tbody.appendChild(row);

                            sentenceCell.addEventListener('mouseup', (e) => {
                                const selectedText = window.getSelection().toString();
                                if (selectedText) {
                                    const contextMenu = document.createElement('ul');
                                    const menuItem = document.createElement('li');
                                    
                                    menuItem.textContent = 'How to read';
                                    menuItem.style.backgroundColor = 'green'; // Thêm màu nền

                                    menuItem.addEventListener('click', () => {
                                        document.getElementById('english').value = selectedText; // Set value of vietnamese input to selected text
                                        document.getElementById('modal').classList.remove('hidden');
                                        document.body.removeChild(contextMenu); // Remove the context menu after clicking
                                    });
                                    contextMenu.appendChild(menuItem);
                                    document.body.appendChild(contextMenu);
                                    contextMenu.style.position = 'absolute';
                                    contextMenu.style.left = `${e.pageX}px`;
                                    contextMenu.style.top = `${e.pageY}px`;
                                }
                            });
                        });
                    })
                    .catch(error => console.error('Error fetching data:', error));
            }
        });
    }
);

document.getElementById('sessionDropdown').addEventListener('change', (event) => {
    if (event.target.value === 'add-session') {
        openPopup();
    }
});
function openPopup() {
    document.getElementById('sessionPopup').style.display = 'block';
}

function closePopup() {
    document.getElementById('sessionPopup').style.display = 'none';
}

function saveSession() {
    const newSessionName = document.getElementById('newSessionName').value;
    fetch('/add-session', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ session: newSessionName , type:'conversion'})
    }).then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Section mới đã được thêm!');
                const dropdown = document.getElementById('sessionDropdown');
                const option = document.createElement('option');
                option.value = data.session_encode;
                option.text = newSessionName;
                dropdown.add(option, dropdown.length - 1);
                dropdown.value = data.session_encode;
                closePopup();
            } else {
                alert('Có lỗi xảy ra, vui lòng thử lại!');
            }
        });
}

document.getElementById('processButton').addEventListener('click', () => {
    //
    processButton = document.getElementById('saveConvButton');
    processButton.removeAttribute("disabled", ""); 
    const inputText = document.getElementById('inputText').value;
    // Cải thiện việc tách câu để bao gồm các dấu chấm, dấu hỏi, và dấu chấm than
    const sentences = inputText.match(/[^.!?]+[.!?]+[\])'"`’”]*|.+/g) || [];
    const tbody = document.getElementById('resultTable').querySelector('tbody');
    tbody.innerHTML = ''; // Clear existing content

    sentences.forEach((sentence, index) => {
        if (sentence.trim()) {
            const row = document.createElement('tr');

            const sentenceCell = document.createElement('td');
            sentenceCell.textContent = sentence.trim();
            row.appendChild(sentenceCell);

            const infoCell = document.createElement('td');
            infoCell.innerHTML = `
                <button id="startRecording" disabled>Start Recording</button> 
                <button id="stopRecording" disabled>Stop Recording</button> 
                <input type="file" class="audio-upload" disabled />
                <audio controls></audio>`;
         //   infoCell.innerHTML = '<button>Start Recording</button> <button>Stop Recording</button> <input type="file" class="audio-upload" /><audio controls></audio>';
            row.appendChild(infoCell);

            const actionsCell = document.createElement('td');

            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Delete';
            deleteButton.addEventListener('click', () => {
                tbody.removeChild(row);
            });
            actionsCell.appendChild(deleteButton);

            const mergeAboveButton = document.createElement('button');
            mergeAboveButton.textContent = '↑↑↑';
            mergeAboveButton.addEventListener('click', () => {
                if (row.previousElementSibling) {
                    const previousRow = row.previousElementSibling;
                    const previousSentenceCell = previousRow.cells[0];
                    previousSentenceCell.textContent += ' ' + sentenceCell.textContent;
                    tbody.removeChild(row);
                }
            });
            actionsCell.appendChild(mergeAboveButton);

            const mergeBelowButton = document.createElement('button');
            mergeBelowButton.textContent = '↓↓↓';
            mergeBelowButton.addEventListener('click', () => {
                if (row.nextElementSibling) {
                    const nextRow = row.nextElementSibling;
                    const nextSentenceCell = nextRow.cells[0];
                    sentenceCell.textContent += ' ' + nextSentenceCell.textContent;
                    tbody.removeChild(nextRow);
                }
            });
            actionsCell.appendChild(mergeBelowButton);

            row.appendChild(actionsCell);
            tbody.appendChild(row);

        }
    });
});

document.getElementById('saveButton').addEventListener('click', () => {
    const vietnamese = document.getElementById('vietnameseInput').value;
    const audio = document.getElementById('audioInput').value;
    // Handle saving the data as needed
    document.getElementById('modal').classList.add('hidden');
});

document.getElementById('saveConvButton').addEventListener('click', () => {
    const convName = document.getElementById('conv_name').value;
    const session = document.getElementById('sessionDropdown').value;
    const textConv = document.getElementById('inputText').value;
    let convItems = []
    const rows = document.querySelectorAll('#resultTable tbody tr');
    rows.forEach((row, index) => {
        convItems.push({"sentence" : row.cells[0].textContent, "indexSen": index})
    });
    const data = {
        convName,
        session,
        textConv,
        convItems
    };

    fetch('/saveConv', {
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
           // closePopup_getlink();
          //  openPopup_quizlink(result.url, result.randomCode);
           // alert('Created URL:' +  result.url + " Code: " + randomCode);
           window.location.href = "http://localhost:3000/teacher/" + "converstion.html?data=" + result.id;
           console.error('OK');
        } else {
            // Handle error
            console.error('Error creating URL:', result.message);
        }
    });
});

document.addEventListener('click', (e) => {
    if (!e.target.closest('#modal') && !e.target.closest('td')) {
      //  document.getElementById('modal').classList.add('hidden');
      console.log("dd")
        const contextMenu = document.querySelector('ul');
        if (contextMenu) {
            contextMenu.remove();
        }
    } 
});

function convertImageToText() {
    const imageInput = document.getElementById('imageInput').files[0];
    const inputText = document.getElementById('inputText');

    if (imageInput) {
        Tesseract.recognize(
            imageInput,
            'eng',
            {
                logger: m => console.log(m)
            }
        ).then(({ data: { text } }) => {
            inputText.value = text;
        }).catch(error => {
            console.error("An error occurred: " + error.message);
        });
    } else {
        alert("Please upload an image.");
    }
}