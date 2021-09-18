import { useState } from "react";
import "./App.css";
import logo from "./logo.svg";
import Login from "./Login";
import CallCard from "./Call/CallCard";

function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [acsUser, setAcsUser] = useState({});

  const setUserInfo = (loggedIn, userInfo) => {
    if (loggedIn) {
      setAcsUser({
        communicationUserId: userInfo.communicationUserId,
        token: userInfo.token,
        displayName: userInfo.displayName,
      });
      setLoggedIn(loggedIn);
    }
  };

  return (
    <div className="App">
      <nav class="navbar navbar-dark bg-dark">
        <a class="navbar-brand" href="/">
          <img src={logo} width="30" height="30" alt="" className="mr-2" />
          Azure Communication Services
        </a>
      </nav>
      {!loggedIn ? (
        <Login setUserInfo={setUserInfo} />
      ) : (
        <CallCard acsUser={acsUser} />
      )}
    </div>
  );
}

export default App;
