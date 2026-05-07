// Sesuaikan URL ini dengan URL Direct dari Hugging Face kamu
const API_URL = "https://axlv284-mycoins-backend.hf.space";

// PENTING: Jika di log Hugging Face rutenya terbaca sebagai /backend/api/...,
// tambahkan /backend di depan /api. Jika tidak, biarkan seperti ini.
const ENDPOINT = `${API_URL}/api`;

async function loadData() {
  try {
    const res = await fetch(`${ENDPOINT}/tagihan`);

    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

    const data = await res.json();
    const tbody = document.getElementById("tabelBody");
    if (!tbody) return;

    tbody.innerHTML = "";

    if (!data || data.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="6" class="p-4 text-center text-gray-500">Belum ada data. Silakan upload file PDF.</td></tr>';
      return;
    }

    data.forEach((item) => {
      tbody.innerHTML += `
                <tr class="border hover:bg-gray-50 transition">
                    <td class="p-4 font-mono text-blue-700 font-bold">${item.nomor_bukti || "-"}</td>
                    <td class="p-4 text-center font-medium">${item.masa || "-"}</td>
                    <td class="p-4">${item.penerima || "-"}</td>
                    <td class="p-4 font-bold text-gray-900 text-right">${item.pajak || "0"}</td>
                    <td class="p-4 text-center">
                        <span class="px-3 py-1 rounded-full text-xs font-semibold ${item.status === "Sudah Materai" ? "bg-green-100 text-green-700 border border-green-200" : "bg-yellow-100 text-yellow-700 border border-yellow-200"}">
                            ${item.status || "Unknown"}
                        </span>
                    </td>
                    <td class="p-4 text-center">
                        ${
                          item.status === "Belum Materai"
                            ? `<button onclick="prosesMaterai(${item.id})" class="bg-blue-600 text-white px-4 py-1 rounded shadow hover:bg-blue-700 text-xs transition">Proses</button>`
                            : `<span class="text-green-600 font-bold text-xs">✓ Selesai</span>`
                        }
                    </td>
                </tr>`;
    });
  } catch (err) {
    console.error("Gagal mengambil data:", err);
    const tbody = document.getElementById("tabelBody");
    if (tbody)
      tbody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-red-500">Gagal terhubung ke Backend (Hugging Face). Cek Console F12.</td></tr>`;
  }
}

async function uploadFile() {
  const fileInput = document.getElementById("fileInput");
  const btn = document.querySelector("button[onclick='uploadFile()']"); // Tombol upload

  if (fileInput.files.length === 0)
    return alert("Pilih file PDF terlebih dahulu!");

  const formData = new FormData();
  formData.append("file", fileInput.files[0]);

  try {
    // Ubah UI sebentar biar kelihatan lagi proses
    if (btn) btn.innerText = "Processing...";

    const res = await fetch(`${ENDPOINT}/upload`, {
      method: "POST",
      body: formData,
    });

    if (res.ok) {
      alert("File Berhasil di-Upload & Dianalisis!");
      fileInput.value = "";
      loadData();
    } else {
      const errorData = await res.json();
      alert(`Gagal Upload: ${errorData.detail || "Error internal server"}`);
    }
  } catch (err) {
    console.error("Upload Error:", err);
    alert(
      "Error Koneksi: Pastikan Backend di Hugging Face statusnya 'Running'.",
    );
  } finally {
    if (btn) btn.innerText = "Upload PDF";
  }
}

async function prosesMaterai(id) {
  try {
    const res = await fetch(`${ENDPOINT}/proses/${id}`, { method: "POST" });
    if (res.ok) {
      loadData();
    } else {
      alert("Gagal memproses materai.");
    }
  } catch (err) {
    console.error("Gagal memproses materai:", err);
  }
}

// Jalankan loadData saat halaman dibuka
document.addEventListener("DOMContentLoaded", loadData);
