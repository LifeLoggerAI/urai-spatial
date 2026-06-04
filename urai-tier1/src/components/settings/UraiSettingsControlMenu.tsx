import {
  URAI_APP_VERSION,
  URAI_BUILD_LABEL,
  URAI_RELEASE_CHANNEL,
} from "../../lib/system/version";

export function UraiSettingsControlMenu() {
  return (
    <section aria-labelledby="urai-settings-about-heading">
      <h2 id="urai-settings-about-heading">About</h2>
      <dl>
        <div>
          <dt>Release</dt>
          <dd>{URAI_BUILD_LABEL}</dd>
        </div>
        <div>
          <dt>Version</dt>
          <dd>{URAI_APP_VERSION}</dd>
        </div>
        <div>
          <dt>Launch phase</dt>
          <dd>{URAI_RELEASE_CHANNEL}</dd>
        </div>
      </dl>
      <p>Privacy defaults remain unchanged.</p>
    </section>
  );
}

export default UraiSettingsControlMenu;
