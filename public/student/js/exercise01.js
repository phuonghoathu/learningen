let canvas = new fabric.Canvas('canvas' ,{
    width: 600,  // Đặt chiều rộng cho canvas
    height: 400  // Đặt chiều cao cho canvas
});
let images = [];
let currentIndex = 0;
let editedImages = [];

// Hàm tải danh sách hình ảnh từ API
function loadImages() {
    fetch('/api/images')
        .then(response => response.json())
        .then(data => {
            images = data;
            loadCurrentImage();
        })
        .catch(error => console.error('Error:', error));
}

// Hàm tải hình ảnh hiện tại lên canvas
function loadCurrentImage() {
    const imageUrl = images[currentIndex];
    fabric.Image.fromURL(imageUrl, function(img) {
        const originalWidth = img.width;
        const originalHeight = img.height;

        const targetWidth = 600;
        const targetHeight = (originalHeight * targetWidth) / originalWidth;

        // Cập nhật kích thước canvas
        canvas.setWidth(targetWidth);
        canvas.setHeight(targetHeight);

        // Scale hình ảnh để vừa khít với canvas
        img.scaleToWidth(canvas.width);
        img.scaleToHeight(canvas.height);

        canvas.clear();
        canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas));

        // Phục hồi các chỉnh sửa nếu có
        if (editedImages[currentIndex]) {
            canvas.loadFromJSON(editedImages[currentIndex], canvas.renderAll.bind(canvas));
        }
    });
}

// Thêm văn bản vào hình ảnh
document.getElementById('addText').addEventListener('click', function() {
    const text = new fabric.Textbox('Type here', {
        left: 50,
        top: 50,
        width: 150,
        fontSize: 20,
        backgroundColor: "#e3dac9",
        fill: "green",
        borderColor: 'red',
        cornerColor: 'blue',
        cornerSize: 10,
        transparentCorners: false
    });
    canvas.add(text);
});

// Chuyển đến hình ảnh tiếp theo
document.getElementById('nextImage').addEventListener('click', function() {
    saveCurrentEdit();
    if (currentIndex < images.length - 1) {
        currentIndex++;
        loadCurrentImage();
    }
});

// Quay lại hình ảnh trước đó
document.getElementById('prevImage').addEventListener('click', function() {
    saveCurrentEdit();
    if (currentIndex > 0) {
        currentIndex--;
        loadCurrentImage();
    }
});

// Lưu chỉnh sửa hình ảnh hiện tại
function saveCurrentEdit() {
    const serialized = JSON.stringify(canvas.toJSON());
    editedImages[currentIndex] = serialized;
}

// Submit hình ảnh hiện tại lên server
document.getElementById('submitImage').addEventListener('click', function() {
    saveCurrentEdit();
    submitImage(images[currentIndex], editedImages[currentIndex]);
});

// Submit tất cả hình ảnh đã chỉnh sửa lên server
document.getElementById('submitAll').addEventListener('click', function() {
    saveCurrentEdit();
    editedImages.forEach((dataUrl, index) => {
        submitImage(images[index], dataUrl);
    });
});

// Hàm submit hình ảnh lên server
function submitImage(originalUrl, editedDataUrl) {
    fetch('/api/submit', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ originalUrl, editedDataUrl })
    })
    .then(response => response.json())
    .then(data => console.log('Success:', data))
    .catch(error => console.error('Error:', error));
}

// Tải danh sách hình ảnh khi trang được tải
window.onload = loadImages;
