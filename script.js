const API_URL = "http://127.0.0.1:8000";

async function loadData() {
    try {
        const res = await fetch(`${API_URL}/api/tagihan`);
        const data = await res.json();
        const tbody = document.getElementById('tabelBody');
        tbody.innerHTML = '';

        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="p-4 text-center text-gray-500">Belum ada data. Silakan upload file PDF.</td></tr>';
            return;
        }

        data.forEach(item => {
            tbody.innerHTML += `
                <tr class="border hover:bg-gray-50 transition">
                    <td class="p-4 font-mono text-blue-700 font-bold">${item.nomor_bukti}</td>
                    <td class="p-4 text-center font-medium">${item.masa}</td>
                    <td class="p-4">${item.penerima}</td>
                    <td class="p-4 font-bold text-gray-900 text-right">${item.pajak}</td>
                    <td class="p-4 text-center">
                        <span class="px-3 py-1 rounded-full text-xs font-semibold ${item.status === 'Sudah Materai' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-yellow-100 text-yellow-700 border border-yellow-200'}">
                            ${item.status}
                        </span>
                    </td>
                    <td class="p-4 text-center">
                        ${item.status === 'Belum Materai' 
                            ? `<button onclick="prosesMaterai(${item.id})" class="bg-blue-600 text-white px-4 py-1 rounded shadow hover:bg-blue-700 text-xs transition">Proses</button>` 
                            : `<span class="text-green-600 font-bold text-xs">✓ Selesai</span>`}
                    </td>
                </tr>`;
        });
    } catch (err) {
        console.error("Gagal mengambil data:", err);
    }
}

async function uploadFile() {
    const fileInput = document.getElementById('fileInput');
    if (fileInput.files.length === 0) return alert("Pilih file PDF terlebih dahulu!");

    const formData = new FormData();
    formData.append("file", fileInput.files[0]);

    try {
        const res = await fetch(`${API_URL}/api/upload`, { method: 'POST', body: formData });
        if (res.ok) {
            alert("File Berhasil di-Upload & Dianalisis!");
            fileInput.value = "";
            loadData();
        }
    } catch (err) {
        alert("Terjadi kesalahan koneksi ke server backend.");
    }
}

async function prosesMaterai(id) {
    try {
        const res = await fetch(`${API_URL}/api/proses/${id}`, { method: 'POST' });
        if (res.ok) loadData();
    } catch (err) {
        console.error("Gagal memproses materai:", err);
    }
}

loadData();