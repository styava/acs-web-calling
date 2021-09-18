import React from "react";
import { CallClient, LocalVideoStream } from "@azure/communication-calling";
import { AzureCommunicationTokenCredential } from "@azure/communication-common";
import { setLogLevel } from "@azure/logger";
import IncomingCallCard from "./IncomingCallCard";
import OngoingCallCard from "./OngoingCallCard";

export default class CallCard extends React.Component {
  constructor(props) {
    super(props);
    this.user = props.acsUser;
    this.callClient = null;
    this.callAgent = null;
    this.deviceManager = null;
    this.callError = null;

    this.state = {
      userId: undefined,
      id: undefined,
      loggedIn: false,
      call: undefined,
      incomingCall: undefined,
      selectedCameraDeviceId: null,
      selectedSpeakerDeviceId: null,
      selectedMicrophoneDeviceId: null,
      deviceManagerWarning: null,
      callError: null,
      showVideo: false,
      meetingLink: undefined,
    };
  }

  handleLogIn = async () => {
    if (this.user) {
      try {
        const tokenCredential = new AzureCommunicationTokenCredential(
          this.user.token
        );
        setLogLevel("verbose");
        this.callClient = new CallClient();
        this.callAgent = await this.callClient.createCallAgent(
          tokenCredential,
          { displayName: this.user.displayName }
        );
        debugger;
        window.callAgent = this.callAgent;
        this.deviceManager = await this.callClient.getDeviceManager();
        await this.deviceManager.askDevicePermission({ audio: true });
        await this.deviceManager.askDevicePermission({ video: true });
        this.callAgent.on("callsUpdated", (e) => {
          console.log(`callsUpdated, added=${e.added}, removed=${e.removed}`);

          e.added.forEach((call) => {
            this.setState({ call: call });
          });

          e.removed.forEach((call) => {
            if (this.state.call && this.state.call === call) {
              this.displayCallEndReason(this.state.call.callEndReason);
            }
          });
        });
        this.callAgent.on("incomingCall", (args) => {
          const incomingCall = args.incomingCall;
          if (this.state.call) {
            incomingCall.reject();
            return;
          }

          this.setState({ incomingCall: incomingCall });

          incomingCall.on("callEnded", (args) => {
            this.displayCallEndReason(args.callEndReason);
          });
        });

        this.setState({ loggedIn: true });
      } catch (e) {
        console.error(e);
      }
    }
  };

  displayCallEndReason = (callEndReason) => {
    if (callEndReason.code !== 0 || callEndReason.subCode !== 0) {
      this.setState({
        callError: `Call end reason: code: ${callEndReason.code}, subcode: ${callEndReason.subCode}`,
      });
    }

    this.setState({ call: null, incomingCall: null });
  };

  async getCallOptions(withVideo) {
    let callOptions = {
      videoOptions: {
        localVideoStreams: undefined,
      },
      audioOptions: {
        muted: false,
      },
    };

    let cameraWarning = undefined;
    let speakerWarning = undefined;
    let microphoneWarning = undefined;

    // On iOS, device permissions are lost after a little while, so re-ask for permissions
    await this.deviceManager.askDevicePermission({ video: true });
    await this.deviceManager.askDevicePermission({ audio: true });

    const cameras = await this.deviceManager.getCameras();
    const cameraDevice = cameras[0];
    if (cameraDevice && cameraDevice?.id !== "camera:") {
      this.setState({
        selectedCameraDeviceId: cameraDevice?.id,
        cameraDeviceOptions: cameras.map((camera) => {
          return { key: camera.id, text: camera.name };
        }),
      });
    }
    if (withVideo) {
      try {
        if (!cameraDevice || cameraDevice?.id === "camera:") {
          throw new Error("No camera devices found.");
        } else if (cameraDevice) {
          callOptions.videoOptions = {
            localVideoStreams: [new LocalVideoStream(cameraDevice)],
          };
        }
      } catch (e) {
        cameraWarning = e.message;
      }
    }

    try {
      const speakers = await this.deviceManager.getSpeakers();
      const speakerDevice = speakers[0];
      if (!speakerDevice || speakerDevice.id === "speaker:") {
        throw new Error("No speaker devices found.");
      } else if (speakerDevice) {
        this.setState({
          selectedSpeakerDeviceId: speakerDevice.id,
          speakerDeviceOptions: speakers.map((speaker) => {
            return { key: speaker.id, text: speaker.name };
          }),
        });
        await this.deviceManager.selectSpeaker(speakerDevice);
      }
    } catch (e) {
      speakerWarning = e.message;
    }

    try {
      const microphones = await this.deviceManager.getMicrophones();
      const microphoneDevice = microphones[0];
      if (!microphoneDevice || microphoneDevice.id === "microphone:") {
        throw new Error("No microphone devices found.");
      } else {
        this.setState({
          selectedMicrophoneDeviceId: microphoneDevice.id,
          microphoneDeviceOptions: microphones.map((microphone) => {
            return { key: microphone.id, text: microphone.name };
          }),
        });
        await this.deviceManager.selectMicrophone(microphoneDevice);
      }
    } catch (e) {
      microphoneWarning = e.message;
    }

    if (cameraWarning || speakerWarning || microphoneWarning) {
      this.setState({
        deviceManagerWarning: `${cameraWarning ? cameraWarning + " " : ""}
                ${speakerWarning ? speakerWarning + " " : ""}
                ${microphoneWarning ? microphoneWarning + " " : ""}`,
      });
    }

    return callOptions;
  }

  placeCall = async (withVideo) => {
    try {
      this.setState({ showVideo: withVideo });
      const callOptions = await this.getCallOptions(withVideo);
      this.callAgent.startCall(
        [{ communicationUserId: this.state.userId }],
        callOptions
      );
    } catch (e) {
      console.error("Failed to place a call", e);
      this.setState({ callError: "Failed to place a call: " + e });
    }
  };

  joinTeamsMeeting = async (withVideo) => {
    const callOptions = await this.getCallOptions(withVideo);
    if(this.state.meetingLink){
      this.callAgent.join({meetingLink: this.state.meetingLink}, callOptions);
    } else {
      alert("please provide a valid meeting link");
    }
  };

  componentDidMount() {
    this.handleLogIn();
  }

  render() {
    return (
      <div className="container mt-4">
        {!this.state.call && !this.state.incomingCall && (
          <div className="jumbotron text-left">
            <h3>Place a call</h3>
            <p className="text-secondary">
              Paste participant Communication User ID and place a call. <br />
              <b>
                Communication User ID: {this.props.acsUser.communicationUserId}
              </b>
            </p>
            <input
              type="text"
              className="mr-2 mb-2 form-control"
              value={this.state.userId}
              onChange={(e) => this.setState({ userId: e.target.value })}
            />
            <button
              className="btn btn-success mr-2"
              onClick={() => this.placeCall(false)}
            >
              Place call
            </button>
            <button
              className="btn btn-success"
              onClick={() => this.placeCall(true)}
            >
              Place call with Video
            </button>

            {/* Teams stuff */}
            <h3 className="mt-5">Join a teams meeting</h3>
            <p className="text-secondary">
              Paste a meeting link. <br />
              <b>
                Communication User ID: {this.props.acsUser.communicationUserId}
              </b>
            </p>
            <input
              type="text"
              className="mr-2 mb-2 form-control"
              value={this.state.meetingLink}
              onChange={(e) => this.setState({ meetingLink: e.target.value })}
            />
            <button
              className="btn btn-success mr-2"
              onClick={() => this.joinTeamsMeeting(false)}
            >
              Place call
            </button>
            <button
              className="btn btn-success"
              onClick={() => this.joinTeamsMeeting(true)}
            >
              Place call with Video
            </button>
          </div>
        )}
        {this.state.call && (
          <OngoingCallCard
            call={this.state.call}
            user={this.user}
            showVideo={this.state.showVideo}
            deviceManager={this.deviceManager}
            selectedCameraDeviceId={this.state.selectedCameraDeviceId}
            cameraDeviceOptions={this.state.cameraDeviceOptions}
            speakerDeviceOptions={this.state.speakerDeviceOptions}
            microphoneDeviceOptions={this.state.microphoneDeviceOptions}
            onShowCameraNotFoundWarning={(show) => {
              this.setState({ showCameraNotFoundWarning: show });
            }}
            onShowSpeakerNotFoundWarning={(show) => {
              this.setState({ showSpeakerNotFoundWarning: show });
            }}
            onShowMicrophoneNotFoundWarning={(show) => {
              this.setState({ showMicrophoneNotFoundWarning: show });
            }}
          />
        )}
        {!this.state.call && this.state.incomingCall && (
          <IncomingCallCard
            incomingCall={this.state.incomingCall}
            acceptCallOptions={async () => await this.getCallOptions()}
            acceptCallWithVideoOptions={async () =>
              await this.getCallOptions(true)
            }
            onReject={() => {
              this.setState({ incomingCall: undefined });
            }}
          />
        )}
      </div>
    );
  }
}
