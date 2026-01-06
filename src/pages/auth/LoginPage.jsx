export default function LoginPage({
  loginData,
  setLoginData,
  handleLogin,
}) {
  return (
    <div className="page page-center">
      <div className="container-tight py-4">
        <div className="text-center mb-4">
          <h1>CT Lab</h1>
        </div>

        <div className="card card-md">
          <div className="card-body">
            <h2 className="h2 text-center mb-4">
              LAB MANAGEMENT SYSTEM
            </h2>

            <div className="mb-3">
              <label className="form-label">User ID</label>
              <input
                className="form-control"
                value={loginData.username}
                onChange={(e) =>
                  setLoginData({
                    ...loginData,
                    username: e.target.value,
                  })
                }
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-control"
                value={loginData.password}
                onChange={(e) =>
                  setLoginData({
                    ...loginData,
                    password: e.target.value,
                  })
                }
              />
            </div>

            <div className="form-footer">
              <button
                className="btn btn-primary w-100"
                onClick={handleLogin}
              >
                Sign in
              </button>
            </div>

            <div className="text-muted text-center mt-3">
              admin / user<br />
              password: 1234
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
