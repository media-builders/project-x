import realestateFollowup from "./realestate/followup.json";
import realestateColdoutreach from "./realestate/coldoutreach.json";
import clinicReceptionist from "./clinic/receptionist.json";
import clinicAppointment from "./clinic/appointmentreminder.json";
import clinicIntake from "./clinic/patientintake.json";

export default {
  realestate: [
    ...realestateFollowup.templates,
    ...realestateColdoutreach.templates
  ],
  clinic: [
    ...clinicReceptionist.templates,
    ...clinicAppointment.templates,
    ...clinicIntake.templates
  ]
};
