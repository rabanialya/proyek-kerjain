"""
Konfigurasi platform Kerjain — rekening penerima transfer manual.

CATATAN PENTING:
  Rekening di bawah adalah PLACEHOLDER. Nilai ini belum dikonfigurasi
  dengan rekening resmi platform. Admin harus memperbarui file ini
  (atau sumber konfigurasi yang sesuai) sebelum platform digunakan
  secara publik.

  Jangan menampilkan nilai placeholder ini kepada pengguna sebagai
  rekening sungguhan. Frontend menampilkan pesan "belum dikonfigurasi"
  jika is_configured = False.
"""

PLATFORM_BANK_INFO: dict = {
    # Set ke True hanya setelah rekening resmi diisi.
    "is_configured": False,

    # Informasi rekening — isi dengan data resmi sebelum go-live.
    "bank_name": "",           # Contoh: "BCA", "Mandiri", "BNI"
    "account_number": "",      # Nomor rekening platform
    "account_holder": "",      # Nama pemegang rekening
    "branch": "",              # Cabang (opsional)

    # Keterangan tambahan yang ditampilkan ke Employer
    "transfer_note": (
        "Rekening platform belum dikonfigurasi. "
        "Hubungi Admin Kerjain untuk informasi transfer."
    ),
}
