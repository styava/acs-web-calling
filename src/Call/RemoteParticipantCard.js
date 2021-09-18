import React from "react";
import { VideoStreamRenderer } from "@azure/communication-calling";

export default class RemoteParticipantCard extends React.Component {
  constructor(props) {
    super(props);
    this.stream = props.stream;
    this.remoteParticipant = props.remoteParticipant;
    this.componentId = `${this.remoteParticipant.identifier.communicationUserId}-${this.stream.mediaStreamType}-${this.stream.id}`;
    this.videoContainerId = this.componentId + "-videoContainer";
    this.renderer = undefined;
    this.view = undefined;
    this.state = {
      isSpeaking: false,
      displayName: this.remoteParticipant.displayName?.trim(),
    };
  }

  async componentDidMount() {
    document.getElementById(this.videoContainerId).hidden = true;

    this.remoteParticipant.on("isSpeakingChanged", () => {
      this.setState({ isSpeaking: this.remoteParticipant.isSpeaking });
    });

    this.remoteParticipant.on("isMutedChanged", () => {
      if (this.remoteParticipant.isMuted) {
        this.setState({ isSpeaking: false });
      }
    });
    this.remoteParticipant.on("displayNameChanged", () => {
      this.setState({
        displayName: this.remoteParticipant.displayName?.trim(),
      });
    });

    this.stream.on("isAvailableChanged", async () => {
      try {
        if (this.stream.isAvailable && !this.renderer) {
          await this.createRenderer();
          this.attachRenderer();
        } else {
          this.disposeRenderer();
        }
      } catch (e) {
        console.error(e);
      }
    });
  }

  getRenderer() {
    return this.renderer;
  }

  async createRenderer() {
    if (!this.renderer) {
      this.renderer = new VideoStreamRenderer(this.stream);
      this.view = await this.renderer.createView();
    }
  }

  async attachRenderer() {
    try {
      document.getElementById(this.videoContainerId).hidden = false;
      document
        .getElementById(this.videoContainerId)
        .appendChild(this.view.target);
    } catch (e) {
      console.error(e);
    }
  }

  disposeRenderer() {
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = undefined;
      document.getElementById(this.videoContainerId).hidden = true;
    }
  }

  render() {
    return (
      <div id={this.videoContainerId}>
        <h6>Stream Type: {this.stream.mediaStreamType}</h6>
      </div>
    );
  }
}
