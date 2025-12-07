document.addEventListener('DOMContentLoaded', () => {
    fetchAnswers("");
});
async function fetchAnswers(username) {
    const response = await fetch(`/answers?testuser=${username}`);
    if (response.status === 401) {
        showLoginPopup();
    }
    const answers = await response.json();
    const table = document.getElementById('answers-table-body');
    table.innerHTML = '';
    answers.forEach(answer => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${answer.testuser}</td>
            <td>${answer.name}</td>
            <td>${answer.duration}</td>
            <td>${answer.totalPoint}</td>
        `;
        row.addEventListener('click', () => toggleDetails(answer.id, row));
        table.appendChild(row);

        const detailsRow = document.createElement('tr');
        const detailsCell = document.createElement('td');
        detailsCell.colSpan = 4; // Đảm bảo ô này chiếm toàn bộ các cột
        detailsCell.className = 'details';
        detailsCell.id = `details-${answer.id}`;
        detailsRow.appendChild(detailsCell);
        table.appendChild(detailsRow);
    });
}

async function fetchAnswerDetails(answerid) {
    const response = await fetch(`/answerdetails/${answerid}`);
    const details = await response.json();
    const detailsDiv = document.getElementById(`details-${answerid}`);
    detailsDiv.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th>Question</th>
                    <th>Answer</th>
                    <th>Correct</th>
                    <th>Hint Count</th>
                    <th>Point</th>
                </tr>
            </thead>
            <tbody>
                ${details.map(detail => `
                    <tr>
                        <td>${detail.question}</td>
                        <td>${detail.answer}</td>
                        <td>${detail.correct}</td>
                        <td>${detail.hintCount}</td>
                        <td>${detail.point}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function toggleDetails(answerid, row) {
    const detailsDiv = document.getElementById(`details-${answerid}`);
    if (detailsDiv.style.display === 'none' || detailsDiv.style.display === '') {
        fetchAnswerDetails(answerid);
        detailsDiv.style.display = 'block';
        row.classList.add('active');
    } else {
        detailsDiv.style.display = 'none';
        row.classList.remove('active');
    }
}

function searchAnswers() {
    const username = document.getElementById('username').value;
    fetchAnswers(username);
}