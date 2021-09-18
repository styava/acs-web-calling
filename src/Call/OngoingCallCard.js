import React from "react";
import { LocalVideoStream } from "@azure/communication-calling";
import RemoteParticipantCard from "./RemoteParticipantCard";
import LocalVideoPreviewCard from "./LocalVideoPreviewCard";

export default class OngoingCallCard extends React.Component {
  constructor(props) {
    super(props);
    this.callFinishConnectingResolve = undefined;
    this.call = props.call;
    this.deviceManager = props.deviceManager;
    this.state = {
      callState: this.call.state,
      callId: this.call.id,
      remoteParticipants: this.call.remoteParticipants,
      allRemoteParticipantStreams: [],
      videoOn: !!this.call.localVideoStreams[0],
      micMuted: false,
      onHold:
        this.call.state === "LocalHold" || this.call.state === "RemoteHold",
      screenShareOn: this.call.isScreenShareOn,
      cameraDeviceOptions: props.cameraDeviceOptions
        ? props.cameraDeviceOptions
        : [],
      speakerDeviceOptions: props.speakerDeviceOptions
        ? props.speakerDeviceOptions
        : [],
      microphoneDeviceOptions: props.microphoneDeviceOptions
        ? props.microphoneDeviceOptions
        : [],
      selectedCameraDeviceId: props.selectedCameraDeviceId,
      selectedSpeakerDeviceId: this.deviceManager.selectedSpeaker?.id,
      selectedMicrophoneDeviceId: this.deviceManager.selectedMicrophone?.id,
      showSettings: false,
      showLocalVideo: props.showVideo,
      callMessage: undefined,
      dominantSpeakerMode: false,
      dominantRemoteParticipant: undefined,
    };
  }

  async componentWillMount() {
    if (this.call) {
      this.deviceManager.on("videoDevicesUpdated", async (e) => {
        let newCameraDeviceToUse = undefined;
        e.added.forEach((addedCameraDevice) => {
          newCameraDeviceToUse = addedCameraDevice;
          const addedCameraDeviceOption = {
            key: addedCameraDevice.id,
            text: addedCameraDevice.name,
          };
          this.setState((prevState) => ({
            cameraDeviceOptions: [
              ...prevState.cameraDeviceOptions,
              addedCameraDeviceOption,
            ],
          }));
        });
        // When connectnig a new camera, ts device manager automatically switches to use this new camera and
        // this.call.localVideoStream[0].source is never updated. Hence I have to do the following logic to update
        // this.call.localVideoStream[0].source to the newly added camera. This is a bug. Under the covers, this.call.localVideoStreams[0].source
        // should have been updated automatically by the sdk.
        if (newCameraDeviceToUse) {
          try {
            await this.call.localVideoStreams[0]?.switchSource(
              newCameraDeviceToUse
            );
            this.setState({ selectedCameraDeviceId: newCameraDeviceToUse.id });
          } catch (error) {
            console.error(
              "Failed to switch to newly added video device",
              error
            );
          }
        }

        e.removed.forEach((removedCameraDevice) => {
          this.setState((prevState) => ({
            cameraDeviceOptions: prevState.cameraDeviceOptions.filter(
              (option) => {
                return option.key !== removedCameraDevice.id;
              }
            ),
          }));
        });

        // If the current camera being used is removed, pick a new random one
        if (
          !this.state.cameraDeviceOptions.find((option) => {
            return option.key === this.state.selectedCameraDeviceId;
          })
        ) {
          const newSelectedCameraId = this.state.cameraDeviceOptions[0]?.key;
          const cameras = await this.deviceManager.getCameras();
          const videoDeviceInfo = cameras.find((c) => {
            return c.id === newSelectedCameraId;
          });
          await this.call.localVideoStreams[0]?.switchSource(videoDeviceInfo);
          this.setState({ selectedCameraDeviceId: newSelectedCameraId });
        }
      });

      this.deviceManager.on("audioDevicesUpdated", (e) => {
        e.added.forEach((addedAudioDevice) => {
          const addedAudioDeviceOption = {
            key: addedAudioDevice.id,
            text: addedAudioDevice.name,
          };
          if (addedAudioDevice.deviceType === "Speaker") {
            this.setState((prevState) => ({
              speakerDeviceOptions: [
                ...prevState.speakerDeviceOptions,
                addedAudioDeviceOption,
              ],
            }));
          } else if (addedAudioDevice.deviceType === "Microphone") {
            this.setState((prevState) => ({
              microphoneDeviceOptions: [
                ...prevState.microphoneDeviceOptions,
                addedAudioDeviceOption,
              ],
            }));
          }
        });

        e.removed.forEach((removedAudioDevice) => {
          if (removedAudioDevice.deviceType === "Speaker") {
            this.setState((prevState) => ({
              speakerDeviceOptions: prevState.speakerDeviceOptions.filter(
                (option) => {
                  return option.key !== removedAudioDevice.id;
                }
              ),
            }));
          } else if (removedAudioDevice.deviceType === "Microphone") {
            this.setState((prevState) => ({
              microphoneDeviceOptions: prevState.microphoneDeviceOptions.filter(
                (option) => {
                  return option.key !== removedAudioDevice.id;
                }
              ),
            }));
          }
        });
      });

      this.deviceManager.on("selectedSpeakerChanged", () => {
        this.setState({
          selectedSpeakerDeviceId: this.deviceManager.selectedSpeaker?.id,
        });
      });

      this.deviceManager.on("selectedMicrophoneChanged", () => {
        this.setState({
          selectedMicrophoneDeviceId: this.deviceManager.selectedMicrophone?.id,
        });
      });

      const callStateChanged = () => {
        console.log("Call state changed ", this.call.state);
        this.setState({ callState: this.call.state });

        if (
          this.call.state !== "None" &&
          this.call.state !== "Connecting" &&
          this.call.state !== "Incoming"
        ) {
          if (this.callFinishConnectingResolve) {
            this.callFinishConnectingResolve();
          }
        }
        if (this.call.state === "Incoming") {
          this.setState({
            selectedCameraDeviceId: this.deviceManager.cameraDevices[0]?.id,
          });
          this.setState({
            selectedSpeakerDeviceId: this.deviceManager.speakerDevices[0]?.id,
          });
          this.setState({
            selectedMicrophoneDeviceId:
              this.deviceManager.microphoneDevices[0]?.id,
          });
        }

        if (this.call.state === "Disconnected") {
          this.setState({ dominantRemoteParticipant: undefined });
        }
      };
      callStateChanged();
      this.call.on("stateChanged", callStateChanged);

      this.call.localVideoStreams.forEach((lvs) => {
        this.setState({ videoOn: true });
      });
      this.call.on("localVideoStreamsUpdated", (e) => {
        e.added.forEach((lvs) => {
          this.setState({ videoOn: true });
        });
        e.removed.forEach((lvs) => {
          this.setState({ videoOn: false });
        });
      });

      this.call.on("idChanged", () => {
        console.log("Call id Changed ", this.call.id);
        this.setState({ callId: this.call.id });
      });

      this.call.on("isMutedChanged", () => {
        console.log("Local microphone muted changed ", this.call.isMuted);
        this.setState({ micMuted: this.call.isMuted });
      });

      this.call.on("isScreenSharingOnChanged", () => {
        this.setState({ screenShareOn: this.call.isScreenShareOn });
      });

      this.call.remoteParticipants.forEach((rp) =>
        this.subscribeToRemoteParticipant(rp)
      );
      this.call.on("remoteParticipantsUpdated", (e) => {
        console.log(
          `Call=${this.call.callId}, remoteParticipantsUpdated, added=${e.added}, removed=${e.removed}`
        );
        e.added.forEach((p) => {
          console.log("participantAdded", p);
          this.subscribeToRemoteParticipant(p);
        });
        e.removed.forEach((p) => {
          console.log("participantRemoved", p);
          if (p.callEndReason) {
            this.setState((prevState) => ({
              callMessage: `${
                prevState.callMessage ? prevState.callMessage + `\n` : ``
              }
                                        Remote participant ${
                                          p.communicationUserId
                                        } disconnected: code: ${
                p.callEndReason.code
              }, subCode: ${p.callEndReason.subCode}.`,
            }));
          }
          this.setState({
            remoteParticipants: this.state.remoteParticipants.filter(
              (remoteParticipant) => {
                return remoteParticipant !== p;
              }
            ),
          });
          this.setState({
            streams: this.state.allRemoteParticipantStreams.filter((s) => {
              return s.participant !== p;
            }),
          });
        });
      });
    }
  }

  subscribeToRemoteParticipant(participant) {
    if (
      !this.state.remoteParticipants.find((p) => {
        return p === participant;
      })
    ) {
      this.setState((prevState) => ({
        remoteParticipants: [...prevState.remoteParticipants, participant],
      }));
    }

    participant.on("displayNameChanged", () => {
      console.log("displayNameChanged ", participant.displayName);
    });

    participant.on("stateChanged", () => {
      console.log(
        "Participant state changed",
        participant.identifier.communicationUserId,
        participant.state
      );
    });

    const addToListOfAllRemoteParticipantStreams = (participantStreams) => {
      if (participantStreams) {
        let participantStreamTuples = participantStreams.map((stream) => {
          return {
            stream,
            participant,
            streamRendererComponentRef: React.createRef(),
          };
        });
        participantStreamTuples.forEach((participantStreamTuple) => {
          if (
            !this.state.allRemoteParticipantStreams.find((v) => {
              return v === participantStreamTuple;
            })
          ) {
            this.setState((prevState) => ({
              allRemoteParticipantStreams: [
                ...prevState.allRemoteParticipantStreams,
                participantStreamTuple,
              ],
            }));
          }
        });
      }
    };

    const removeFromListOfAllRemoteParticipantStreams = (
      participantStreams
    ) => {
      participantStreams.forEach((streamToRemove) => {
        const tupleToRemove = this.state.allRemoteParticipantStreams.find(
          (v) => {
            return v.stream === streamToRemove;
          }
        );
        if (tupleToRemove) {
          this.setState({
            allRemoteParticipantStreams:
              this.state.allRemoteParticipantStreams.filter((streamTuple) => {
                return streamTuple !== tupleToRemove;
              }),
          });
        }
      });
    };

    const handleVideoStreamsUpdated = (e) => {
      addToListOfAllRemoteParticipantStreams(e.added);
      removeFromListOfAllRemoteParticipantStreams(e.removed);
    };

    addToListOfAllRemoteParticipantStreams(participant.videoStreams);
    participant.on("videoStreamsUpdated", handleVideoStreamsUpdated);
  }

  async handleVideoOnOff() {
    try {
      const cameras = await this.deviceManager.getCameras();
      const cameraDeviceInfo = cameras.find((cameraDeviceInfo) => {
        return cameraDeviceInfo.id === this.state.selectedCameraDeviceId;
      });
      let selectedCameraDeviceId = this.state.selectedCameraDeviceId;
      let localVideoStream;
      if (this.state.selectedCameraDeviceId) {
        localVideoStream = new LocalVideoStream(cameraDeviceInfo);
      } else if (!this.state.videoOn) {
        const cameras = await this.deviceManager.getCameras();
        selectedCameraDeviceId = cameras[0].id;
        localVideoStream = new LocalVideoStream(cameras[0]);
      }

      if (
        this.call.state === "None" ||
        this.call.state === "Connecting" ||
        this.call.state === "Incoming"
      ) {
        if (this.state.videoOn) {
          this.setState({ videoOn: false });
        } else {
          this.setState({ videoOn: true, selectedCameraDeviceId });
        }
        await this.watchForCallFinishConnecting();
        if (this.state.videoOn) {
          this.call.startVideo(localVideoStream).catch((error) => {});
        } else {
          this.call
            .stopVideo(this.call.localVideoStreams[0])
            .catch((error) => {});
        }
      } else {
        if (this.call.localVideoStreams[0]) {
          await this.call.stopVideo(this.call.localVideoStreams[0]);
        } else {
          await this.call.startVideo(localVideoStream);
        }
      }

      this.setState({ videoOn: this.call.localVideoStreams[0] ? true : false });
    } catch (e) {
      console.error(e);
    }
  }

  async watchForCallFinishConnecting() {
    return new Promise((resolve) => {
      if (
        this.state.callState !== "None" &&
        this.state.callState !== "Connecting" &&
        this.state.callState !== "Incoming"
      ) {
        resolve();
      } else {
        this.callFinishConnectingResolve = resolve;
      }
    }).then(() => {
      this.callFinishConnectingResolve = undefined;
    });
  }

  async handleMicOnOff() {
    try {
      if (!this.call.isMuted) {
        await this.call.mute();
      } else {
        await this.call.unmute();
      }
      this.setState({ micMuted: this.call.isMuted });
    } catch (e) {
      console.error(e);
    }
  }

  async handleHoldUnhold() {
    try {
      if (this.call.state === "LocalHold") {
        this.call.resume();
      } else {
        this.call.hold();
      }
    } catch (e) {
      console.error(e);
    }
  }

  async handleScreenSharingOnOff() {
    try {
      if (this.call.isScreenSharingOn) {
        await this.call.stopScreenSharing();
      } else {
        await this.call.startScreenSharing();
      }
      this.setState({ screenShareOn: this.call.isScreenSharingOn });
    } catch (e) {
      console.error(e);
    }
  }

  render() {
    return (
      <div className="container">
        <div className="text-center">Call State: {this.state.callState}</div>
        <div className="jumbotron row">
          <div className="col-6 border-right border-dark">
            <h5 className="video-title">
              Participant: {this.props.user.displayName}
            </h5>
            {this.state.showLocalVideo && (
              <div className="mb-3">
                <LocalVideoPreviewCard
                  selectedCameraDeviceId={this.state.selectedCameraDeviceId}
                  deviceManager={this.deviceManager}
                  showLocalVideo={this.state.showLocalVideo}
                />
              </div>
            )}
          </div>
          <div className="col-6">
            {(this.state.callState === "Connected" ||
              this.state.callState === "LocalHold" ||
              this.state.callState === "RemoteHold") &&
              this.state.allRemoteParticipantStreams.map((v) => (
                <>
                  <h5 className="video-title">
                    Remote Participant:{" "}
                    {v.participant.displayName
                      ? v.participant.displayName
                      : v.participant.identifier.communicationUserId}
                  </h5>
                  <RemoteParticipantCard
                    key={`${v.participant.identifier.communicationUserId}-${v.stream.mediaStreamType}-${v.stream.id}`}
                    ref={v.streamRendererComponentRef}
                    stream={v.stream}
                    remoteParticipant={v.participant}
                  />
                </>
              ))}
          </div>
        </div>
        <div className="text-center">
          <button className="mr-2 btn btn-danger" onClick={() => this.call.hangUp()}>
            End Call
          </button>
          <button
            className="mr-2 btn btn-dark"
            onClick={() => this.handleVideoOnOff()}
          >
            Turn {this.state.videoOn ? "off" : "on"} Video
          </button>
          <button
            className="mr-2 btn btn-dark"
            onClick={() => this.handleMicOnOff()}
          >
            {this.state.micMuted ? "Unmute" : "Mute"} Mic
          </button>
          <button
            className="mr-2 btn btn-dark"
            onClick={() => this.handleHoldUnhold()}
          >
            {this.state.onHold ? "Unhold" : "Hold"}
          </button>
        </div>
      </div>
    );
  }
}
