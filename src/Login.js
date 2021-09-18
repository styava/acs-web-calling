import React from "react";
import { CommunicationIdentityClient } from "@azure/communication-identity";

export default class Login extends React.Component {
  constructor(props) {
    super(props);
    this.endpoint = process.env.REACT_APP_ACS_ENDPOINT;
    this.accessKey = process.env.REACT_APP_ACS_KEY;
    this.connectionString = process.env.REACT_APP_ACS_CONNECTION_STRING;
    this.communicationIdentityClient = new CommunicationIdentityClient(
      this.connectionString
    );
    this.state = {
      loggedIn: false,
      token: "",
      communicationUserId: "",
      username: "",
    };
  }

  provisionNewUser = async () => {
    try {
      let communicationUserId =
        await this.communicationIdentityClient.createUser();
      const tokenResponse = await this.communicationIdentityClient.getToken(
        communicationUserId,
        ["voip"]
      );

      this.setState({
        loggedIn: true,
        token: tokenResponse.token,
        communicationUserId: communicationUserId.communicationUserId,
      });

      this.props.setUserInfo(this.state.loggedIn, {
        communicationUserId: this.state.communicationUserId,
        token: this.state.token,
        displayName: this.state.username,
      });
    } catch (err) {
      console.log(err);
    }
  };

  render() {
    return (
      <div className="container">
        <div className="jumbotron text-left mt-4 text-wrap">
          {this.state.loggedIn ? (
            <div className="text-wrap">
              <h3>UserID:</h3>
              <h5>{this.state.communicationUserId}</h5>
            </div>
          ) : (
            <>
              <h3>Create a new User</h3>
              <p className="text-secondary">
                Click on login to provision a new user.
              </p>
              <input
                type="text"
                className="form-control"
                placeholder="Username"
                value={this.state.username}
                onChange={(e) => this.setState({ username: e.target.value })}
              />
            </>
          )}

          <button
            className="btn btn-primary mt-2"
            onClick={this.provisionNewUser}
            disabled={this.state.loggedIn}
          >
            Login
          </button>
        </div>
      </div>
    );
  }
}
