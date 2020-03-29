import {
  TJobCheckNewAlertsData,
  TJobCheckNewAlertsResult,
} from "./workerTypes";

import Alert from "../models/Alert";
import { Job } from "bullmq";
import moment from "moment";

/**
 * Check the Alerts for any which have recently become active, and push
 * a notification out to users
 */
export async function processJobCheckNewAlerts(
  job: Job<TJobCheckNewAlertsData, TJobCheckNewAlertsResult>
): Promise<TJobCheckNewAlertsResult> {
  console.info(`${job.name}[${job.id}]\t: Checking for new alerts`);

  const now = new Date();

  const activeAlerts = await Alert.genActiveAlerts(now);

  const unsentAlertWeb = activeAlerts.filter(
    a =>
      !a.wasProcessed &&
      a.start >= // don't do anything about really old alerts
        moment(now)
          .subtract(3, "hours")
          .toDate()
  );

  console.info(
    `${job.name}[${job.id}]\t: Found ${unsentAlertWeb.length} alerts which have not been processed`
  );

  let alertsProcessed = []; // Array<alert IDs>

  unsentAlertWeb.forEach(async (alert, i) => {
    try {
      alert.wasProcessed = true;
      await alert.save();
      alertsProcessed = [...alertsProcessed, alert._id];
      console.debug(`Simulate ${alert} sent to web`);
      job.updateProgress(((i + 1) / alertsProcessed.length) * 100);
    } catch (e) {
      throw e;
    }
  });

  job.updateProgress(100);

  return { alertsProcessed, jobName: job.name, kind: "check_new_alerts" };
}
