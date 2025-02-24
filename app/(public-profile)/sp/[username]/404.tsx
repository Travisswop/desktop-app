export default function Custom404() {
  return (
    <div className="container">
      <div
        style={{
          color: '#000',
          background: '#fff',
          height: '100vh',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div>
          <h1
            style={{
              display: 'inline-block',
              borderRight: '1px solid rgba(0, 0, 0,.3)',
              margin: 0,
              marginRight: '20px',
              padding: '10px 23px 10px 0',
              fontSize: '24px',
              fontWeight: 500,
              verticalAlign: 'top',
            }}
          >
            404
          </h1>
          <div
            style={{
              display: 'inline-block',
              textAlign: 'left',
              lineHeight: '49px',
              height: '49px',
              verticalAlign: 'middle',
            }}
          >
            <h2 className="">This User&apos;s could not be found.</h2>
          </div>
        </div>
      </div>
    </div>
  );
}
