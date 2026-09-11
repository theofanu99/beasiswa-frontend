import {
  useEffect,
  useState,
} from 'react'

import type {
  FormEvent,
} from 'react'

import {
  useNavigate,
  
} from 'react-router-dom'


import {
  getActivePrograms,
} from '../../api/master'

import {
  getPendaftaran,
} from '../../api/transaction'

import type {
  Pendaftaran,
} from '../../api/transaction'


import type {
  Program,
} from '../../api/master'


import {
  login,
  logout,
  registerApplicant,
  getAuthUser,
} from '../../auth/auth'

import type {
  AuthUser,
} from '../../auth/auth'



export default function HomePage() {


  const navigate = useNavigate()

  const [
    currentUser,
    setCurrentUser,
  ] = useState<AuthUser | null>(
    getAuthUser()
  )



  // =========================
  // PROGRAM
  // =========================

  const [
    programs,
    setPrograms,
  ] = useState<Program[]>([])



  const [
    loadingPrograms,
    setLoadingPrograms,
  ] = useState(true)



  const [
    programError,
    setProgramError,
  ] = useState('')



  const [
    selectedProgram,
    setSelectedProgram,
  ] = useState<Program | null>(null)

  const [activeRegistration, setActiveRegistration] =
    useState<Pendaftaran | null>(null)



  // =========================
  // MODAL
  // =========================

  const [
    showLogin,
    setShowLogin,
  ] = useState(false)



  const [
    showRegister,
    setShowRegister,
  ] = useState(false)



  // =========================
  // LOGIN
  // =========================

  const [
    username,
    setUsername,
  ] = useState('')



  const [
    password,
    setPassword,
  ] = useState('')



  const [
    loginError,
    setLoginError,
  ] = useState('')



  const [
    loginLoading,
    setLoginLoading,
  ] = useState(false)



  // =========================
  // REGISTER
  // =========================

  const [
    nik,
    setNik,
  ] = useState('')



  const [
    namaLengkap,
    setNamaLengkap,
  ] = useState('')



  const [
    email,
    setEmail,
  ] = useState('')



  const [
    registerError,
    setRegisterError,
  ] = useState('')



  const [
    registerSuccess,
    setRegisterSuccess,
  ] = useState('')



  const [
    registerLoading,
    setRegisterLoading,
  ] = useState(false)



  // =========================
  // LOAD PROGRAM AKTIF
  // =========================

  useEffect(() => {


    async function loadPrograms(){

      try {

        setLoadingPrograms(true)

        setProgramError('')


        const data =
          await getActivePrograms()


        setPrograms(data)


      } catch(error){

        setProgramError(
          error instanceof Error
            ? error.message
            : 'Gagal mengambil program beasiswa'
        )


      } finally {

        setLoadingPrograms(false)

      }

    }


    loadPrograms()


  }, [])



  // =========================
  // LOAD PENDAFTARAN APPLICANT
  // =========================

  useEffect(() => {
    async function loadRegistration() {
      if (!currentUser) {
        setActiveRegistration(null)
        return
      }

      try {
        const registrations = await getPendaftaran()
        setActiveRegistration(registrations[0] ?? null)
      } catch (error) {
        console.error('Gagal mengambil pendaftaran applicant:', error)
        setActiveRegistration(null)
      }
    }

    void loadRegistration()
  }, [currentUser])

  // =========================
  // LOGIN
  // =========================

async function handleLogin(
  e: FormEvent
){

  e.preventDefault()

  try {

    setLoginLoading(true)

    setLoginError('')


    const result =
      await login(
        username.trim(),
        password
      )


    /*
     * Homepage login hanya untuk APPLICANT.
     * Role internal tidak boleh masuk dari sini.
     */
    if(
      !result.user.roles.includes(
        'APPLICANT'
      )
    ){

      await logout()

      setLoginError(
        'Akun ini adalah akun internal. Silakan gunakan Login Internal.'
      )

      return

    }


    setCurrentUser(
      result.user
    )


    setUsername('')
    setPassword('')

    closeAll()


  } catch(error){

    setLoginError(
      error instanceof Error
        ? error.message
        : 'Login gagal'
    )


  } finally {

    setLoginLoading(false)

  }

}


async function handleLogout(){

  try {

    await logout()

  } finally {

    setCurrentUser(null)

    setUsername('')
    setPassword('')

    setLoginError('')
    setRegisterError('')
    setRegisterSuccess('')

  }

}

  // =========================
  // REGISTER
  // =========================

  async function handleRegister(
    e: FormEvent
  ){

    e.preventDefault()


    try {

      setRegisterLoading(true)

      setRegisterError('')

      setRegisterSuccess('')



      await registerApplicant({

        nik,

        namaLengkap,

        email,

      })



      setRegisterSuccess(
        'Registrasi berhasil. Password sementara dikirim melalui email.'
      )


      setNik('')

      setNamaLengkap('')

      setEmail('')



    } catch(error){


      setRegisterError(
        error instanceof Error
          ? error.message
          : 'Registrasi gagal'
      )



    } finally {

      setRegisterLoading(false)

    }

  }



  function closeAll(){

    setShowLogin(false)

    setShowRegister(false)

    setSelectedProgram(null)

    setLoginError('')

    setRegisterError('')

  }
    return (

    <>

      {/* =========================
          NAVBAR
      ========================= */}

      <nav className="navbar navbar-expand-lg navbar-light bg-white shadow-sm sticky-top">

        <div className="container">

          <a
            className="navbar-brand fw-bold text-primary"
            href="#"
          >
            <i className="bi bi-mortarboard-fill me-2"></i>
            Portal Beasiswa
          </a>



          <div className="d-flex gap-2">

            {
              currentUser ? (

                <>
                  <span className="btn btn-light">
                    Halo, {currentUser.username}
                  </span>

                  <button
                    className="btn btn-outline-danger"
                    onClick={handleLogout}
                  >
                    <i className="bi bi-box-arrow-right me-1"></i>
                    Logout
                  </button>
                </>

              ) : (

                <>
                  <button
                    className="btn btn-outline-primary"
                    onClick={() => {
                      setLoginError('')
                      setShowLogin(true)
                    }}
                  >
                    Login
                  </button>

                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      setRegisterError('')
                      setRegisterSuccess('')
                      setShowRegister(true)
                    }}
                  >
                    Daftar
                  </button>
                </>

              )
            }

          </div>

        </div>

      </nav>




      {/* =========================
          HERO
      ========================= */}


      <section
        className="py-5 bg-light"
      >

        <div className="container">


          <div className="row align-items-center">


            <div className="col-lg-7">


              <h1 className="display-5 fw-bold">

                Raih Masa Depan
                <br />

                Melalui Beasiswa

              </h1>



              <p className="lead text-muted mt-3">

                Temukan program beasiswa terbaik
                dan daftarkan dirimu sekarang.

              </p>



              <button

                className="btn btn-primary btn-lg"

                onClick={() =>
                  document
                    .getElementById('program')
                    ?.scrollIntoView()
                }

              >

                Lihat Program

              </button>


            </div>




            <div className="col-lg-5 text-center">


              <i
                className="bi bi-mortarboard-fill text-primary"
                style={{
                  fontSize:'180px'
                }}
              ></i>


            </div>


          </div>


        </div>


      </section>






      {currentUser && activeRegistration && activeRegistration.status === 'REVISION' && (
        <section className="py-4 bg-light">
          <div className="container">
            <div className="alert alert-warning border-0 shadow-sm mb-0">
              <div className="d-flex justify-content-between align-items-center gap-3">
                <div>
                  <div className="fw-bold">Pendaftaran Memerlukan Revisi</div>
                  <div className="small">Pendaftaran #{activeRegistration.id} perlu diperbaiki.</div>
                </div>
                <button
                  type="button"
                  className="btn btn-warning fw-semibold"
                  onClick={() => navigate(`/pendaftaran/revisi?pendaftaranId=${activeRegistration.id}`)}
                >
                  Perbaiki &amp; Kirim Ulang
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* =========================
          PROGRAM AKTIF
      ========================= */}



      <section
        id="program"
        className="py-5"
      >


        <div className="container">


          <div className="text-center mb-5">


            <h2 className="fw-bold">

              Program Beasiswa Aktif

            </h2>


            <p className="text-muted">

              Pilih program yang sesuai
              dengan minat kamu.

            </p>


          </div>





          {
            loadingPrograms && (

              <div className="text-center">

                <div
                  className="spinner-border text-primary"
                ></div>


                <p className="mt-3 text-muted">

                  Memuat program...

                </p>


              </div>

            )
          }






          {
            programError && (

              <div className="alert alert-danger">

                {programError}

              </div>

            )
          }







          <div className="row g-4">


            {
              programs.map(
                (program) => (


                  <div
                    className="col-md-6 col-lg-4"
                    key={program.id}
                  >


                    <div
                      className="card h-100 shadow-sm border-0"
                    >


                      <div
                        className="card-body"
                      >



                        <span
                          className="badge bg-success mb-3"
                        >

                          <i className="bi bi-check-circle me-1"></i>

                          Aktif

                        </span>





                        <h5
                          className="fw-bold"
                        >

                          {program.nama}

                        </h5>




                        <p
                          className="text-muted small"
                        >

                          {
                            program.deskripsi ||
                            'Belum ada deskripsi program.'
                          }

                        </p>




                        <hr />



                        <div className="small">


                          <p>

                            <i className="bi bi-calendar-event me-2 text-primary"></i>

                            Periode:

                            {' '}

                            {program.periode}


                          </p>




                          <p>

                            <i className="bi bi-people me-2 text-primary"></i>

                            Kuota:

                            {' '}

                            {program.kuota}

                            {' '}
                            Peserta


                          </p>


                        </div>




                      </div>





                      <div className="card-footer bg-white border-0">


                        <button

                          className="btn btn-primary w-100"

                          onClick={() =>
                            setSelectedProgram(program)
                          }

                        >

                          Detail Program

                        </button>


                      </div>




                    </div>



                  </div>


                )

              )
            }



          </div>




        </div>


      </section>








      {/* =========================
          ALUR
      ========================= */}



      <section
        className="py-5 bg-light"
      >

        <div className="container">


          <h2
            className="text-center fw-bold mb-5"
          >

            Alur Pendaftaran

          </h2>



          <div className="row text-center">


            <div className="col-md-4">

              <i
                className="bi bi-person-plus text-primary"
                style={{
                  fontSize:'50px'
                }}
              ></i>


              <h5 className="mt-3">

                Buat Akun

              </h5>


              <p className="text-muted">

                Registrasi akun applicant.

              </p>


            </div>





            <div className="col-md-4">


              <i
                className="bi bi-file-earmark-text text-primary"
                style={{
                  fontSize:'50px'
                }}
              ></i>



              <h5 className="mt-3">

                Isi Pendaftaran

              </h5>



              <p className="text-muted">

                Lengkapi dokumen persyaratan.

              </p>


            </div>





            <div className="col-md-4">


              <i
                className="bi bi-check-circle text-primary"
                style={{
                  fontSize:'50px'
                }}
              ></i>


              <h5 className="mt-3">

                Tunggu Seleksi

              </h5>



              <p className="text-muted">

                Pantau hasil seleksi.

              </p>


            </div>



          </div>


        </div>


      </section>





      {/* =========================
          FOOTER
      ========================= */}



      <footer
        className="py-4 bg-dark text-white"
      >

        <div className="container text-center">


          <p className="mb-0">

            © 2026 Portal Beasiswa

          </p>


        </div>


      </footer>
      {/* =========================
          MODAL DETAIL PROGRAM
      ========================= */}


      {
        selectedProgram && (

          <div
            className="modal fade show d-block"
            style={{
              background:'rgba(0,0,0,.5)'
            }}
          >

            <div
              className="modal-dialog modal-dialog-centered"
            >

              <div
                className="modal-content"
              >


                <div className="modal-header">


                  <h5 className="modal-title fw-bold">

                    {selectedProgram.nama}

                  </h5>


                  <button

                    className="btn-close"

                    onClick={() =>
                      setSelectedProgram(null)
                    }

                  />

                </div>




                <div className="modal-body">


                  <p className="text-muted">

                    {
                      selectedProgram.deskripsi ||
                      'Belum ada deskripsi.'
                    }

                  </p>



                  <hr />



                  <h6 className="fw-bold">

                    Informasi Program

                  </h6>



                  <ul className="list-unstyled small">


                    <li className="mb-2">

                      <i className="bi bi-calendar-event text-primary me-2"></i>

                      Periode:

                      {' '}

                      {selectedProgram.periode}

                    </li>




                    <li>

                      <i className="bi bi-people text-primary me-2"></i>

                      Kuota:

                      {' '}

                      {selectedProgram.kuota}

                      {' '}
                      Peserta

                    </li>


                  </ul>





                  <h6 className="fw-bold mt-4">

                    Persyaratan

                  </h6>



                  {
                    selectedProgram.persyaratan &&
                    selectedProgram.persyaratan.length > 0 ? (


                      <ul className="small text-muted">


                        {
                          selectedProgram.persyaratan.map(
                            (item) => (


                              <li
                                key={item.id}
                                className="mb-2"
                              >


                                {item.nama}


                                {
                                  item.wajib && (

                                    <span
                                      className="text-danger"
                                    >
                                      {' '}*
                                    </span>

                                  )
                                }


                                {
                                  item.deskripsi && (

                                    <div>

                                      {item.deskripsi}

                                    </div>

                                  )
                                }


                              </li>


                            )
                          )
                        }


                      </ul>


                    ) : (


                      <p className="text-muted small">

                        Belum ada persyaratan.

                      </p>


                    )
                  }



                </div>




                <div className="modal-footer">


                  <button

                    className="btn btn-secondary"

                    onClick={() =>
                      setSelectedProgram(null)
                    }

                  >

                    Tutup

                  </button>




                  <button

                    className="btn btn-primary"

                    onClick={() => {

                      if (!currentUser) {
                        setSelectedProgram(null)
                        setLoginError('')
                        setShowLogin(true)
                        return
                      }

                      navigate(
                        `/pendaftaran?beasiswaId=${selectedProgram.id}`
                      )

                    }}

                  >

                    Daftar Sekarang

                  </button>


                </div>



              </div>


            </div>


          </div>

        )
      }





      {/* =========================
          MODAL LOGIN
      ========================= */}



      {
        showLogin && (

          <div
            className="modal fade show d-block"
            style={{
              background:'rgba(0,0,0,.5)'
            }}
          >

            <div className="modal-dialog">


              <div className="modal-content">


                <form onSubmit={handleLogin}>


                  <div className="modal-header">


                    <h5 className="modal-title">

                      Login

                    </h5>


                    <button

                      type="button"

                      className="btn-close"

                      onClick={closeAll}

                    />


                  </div>



                  <div className="modal-body">


                    {
                      loginError && (

                        <div className="alert alert-danger">

                          {loginError}

                        </div>

                      )
                    }




                    <div className="mb-3">


                      <label className="form-label">

                        Username

                      </label>


                      <input

                        className="form-control"

                        value={username}

                        onChange={(e)=>
                          setUsername(e.target.value)
                        }

                        required

                      />


                    </div>





                    <div className="mb-3">


                      <label className="form-label">

                        Password

                      </label>



                      <input

                        type="password"

                        className="form-control"

                        value={password}

                        onChange={(e)=>
                          setPassword(e.target.value)
                        }

                        required

                      />


                    </div>


                  </div>




                  <div className="modal-footer">


                    <button

                      type="submit"

                      className="btn btn-primary"

                      disabled={loginLoading}

                    >

                      {
                        loginLoading
                          ? 'Loading...'
                          : 'Login'
                      }


                    </button>


                  </div>



                </form>


              </div>


            </div>


          </div>

        )
      }






      {/* =========================
          MODAL REGISTER
      ========================= */}



      {
        showRegister && (

          <div
            className="modal fade show d-block"
            style={{
              background:'rgba(0,0,0,.5)'
            }}
          >


            <div className="modal-dialog">


              <div className="modal-content">


                <form onSubmit={handleRegister}>


                  <div className="modal-header">


                    <h5 className="modal-title">

                      Registrasi Applicant

                    </h5>



                    <button

                      type="button"

                      className="btn-close"

                      onClick={closeAll}

                    />


                  </div>




                  <div className="modal-body">



                    {
                      registerError && (

                        <div className="alert alert-danger">

                          {registerError}

                        </div>

                      )
                    }



                    {
                      registerSuccess && (

                        <div className="alert alert-success">

                          {registerSuccess}

                        </div>

                      )
                    }





                    <div className="mb-3">

                      <label className="form-label">

                        NIK

                      </label>


                      <input

                        className="form-control"

                        value={nik}

                        onChange={(e)=>
                          setNik(e.target.value)
                        }

                        required

                      />

                    </div>





                    <div className="mb-3">


                      <label className="form-label">

                        Nama Lengkap

                      </label>



                      <input

                        className="form-control"

                        value={namaLengkap}

                        onChange={(e)=>
                          setNamaLengkap(e.target.value)
                        }

                        required

                      />


                    </div>





                    <div className="mb-3">


                      <label className="form-label">

                        Email

                      </label>



                      <input

                        type="email"

                        className="form-control"

                        value={email}

                        onChange={(e)=>
                          setEmail(e.target.value)
                        }

                        required

                      />


                    </div>



                  </div>




                  <div className="modal-footer">


                    <button

                      type="submit"

                      className="btn btn-primary"

                      disabled={registerLoading}

                    >

                      {
                        registerLoading
                          ? 'Mengirim...'
                          : 'Daftar'
                      }


                    </button>


                  </div>



                </form>


              </div>


            </div>


          </div>

        )
      }




    </>

  )

}