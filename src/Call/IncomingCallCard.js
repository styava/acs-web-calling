import React from "react";

export default class IncomingCallCard extends React.Component {
  constructor(props) {
    super(props);
    this.incomingCall = props.incomingCall;
    this.acceptCallOptions = props.acceptCallOptions;
    this.acceptCallWithVideoOptions = props.acceptCallWithVideoOptions;
  }

  async componentWillMount() {
    this.acceptCallOptions = {
      videoOptions: (await this.acceptCallOptions()).videoOptions,
    };
    this.acceptCallWithVideoOptions = {
      videoOptions: (await this.acceptCallWithVideoOptions()).videoOptions,
    };
  }

  render() {
    return (
      <div className="incoming-call-card bg-dark p-4 text-white">
        {this?.call && <h2>Call Id: {this.state?.callId}</h2>}
        <button
          className="btn btn-success mr-2 mt-2"
          onClick={() => this.incomingCall.accept(this.acceptCallOptions)}
        >
          Accept
        </button>
        <button
          className="btn btn-success mr-2 mt-2"
          onClick={() =>
            this.incomingCall.accept(this.acceptCallWithVideoOptions)
          }
        >
          Accept with video
        </button>
        <button
          className="btn btn-danger mt-2"
          onClick={() => {
            this.incomingCall.reject();
            this.props.onReject();
          }}
        >
          Reject
        </button>
      </div>
    );
  }
}
