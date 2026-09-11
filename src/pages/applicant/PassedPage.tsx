import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  getPendaftaran,
  getPendaftaranById,
  type Pendaftaran,
} from '../../api/transaction'

export default function PassedPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const id = Number(searchParams.get('pendaftaranId'))

  const [data, setData] = useState<Pendaftaran | null>(null)

  useEffect(() => {
    async function load() {
      if (Number.isInteger(id) && id > 0) {
        setData(await getPendaftaranById(id))
        return
      }

      const list = await getPendaftaran()
      setData(list[0] ?? null)
    }

    load().catch(console.error)
  }, [id])

  return (
    <main className="bg-light min-vh-100 py-5">
      <div className="container" style={{ maxWidth: 850 }}>
        <div className="card border-0 shadow-sm text-center">
          <div className="card-body p-5">
            <i className="bi bi-trophy-fill text-warning display-1" />
            <h1 className="fw-bold mt-4">Selamat, Anda Lulus!</h1>
            <p className="lead text-muted">
              Anda dinyatakan lolos seleksi beasiswa pelatihan.
            </p>

            {data?.hasilSeleksi?.catatan && (
              <div className="alert alert-success text-start mt-4">
                <strong>Catatan Hasil Seleksi</strong>
                <div className="mt-2">{data.hasilSeleksi.catatan}</div>
              </div>
            )}

            <button
              className="btn btn-primary mt-3"
              onClick={() => navigate('/')}
            >
              Kembali ke Beranda
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
