/** Veterinary clinics in Estonia — sourced from reference-old-site/Vet Clinics list.xlsx */
export type VetClinic = {
  clinic_name: string;
  city: string;
  address: string;
  phone: string;
  emergency?: boolean;
  opening_hours?: string;
  latitude?: number;
  longitude?: number;
};

export const VET_CLINICS: VetClinic[] = [
  { clinic_name: "Evidensia Fahle Animal Clinic", city: "Tallinn", address: "Tartu mnt 82", phone: "+372 6 827 672", opening_hours: "Mon–Fri 9–19", latitude: 59.425512, longitude: 24.780319 },
  { clinic_name: "Evidensia Timmu Animal Clinic", city: "Tallinn", address: "Mustamäe tee 44/1", phone: "+372 6 675 676", opening_hours: "Mon–Fri 9–19", latitude: 59.417422, longitude: 24.692882 },
  { clinic_name: "Evidensia Billy Animal Clinic", city: "Tallinn", address: "Ehitajate tee 103a", phone: "+372 6 570 310", opening_hours: "Mon–Fri 9–19", latitude: 59.41235, longitude: 24.660664 },
  { clinic_name: "Evidensia Västriku Animal Clinic", city: "Tallinn", address: "Västriku 2a", phone: "+372 6 553 366", opening_hours: "Mon–Fri 9–19", latitude: 59.415256, longitude: 24.728642 },
  { clinic_name: "Evidensia Emergency Clinic", city: "Tallinn", address: "Mustamäe tee 44/2", phone: "+372 5 023 191", emergency: true, opening_hours: "24/7", latitude: 59.417296, longitude: 24.692088 },
  { clinic_name: "PetCity Rannamõisa 24/7 Clinic", city: "Tallinn", address: "Rannamõisa tee 8", phone: "+372 5 153 112", emergency: true, opening_hours: "24/7", latitude: 59.428728, longitude: 24.625339 },
  { clinic_name: "PetCity Ülemiste Clinic", city: "Tallinn", address: "Suur-Sõjamäe 4", phone: "+372 5 136 990", opening_hours: "Mon-Sat 10-21, Sun 10-19", latitude: 59.421566, longitude: 24.795831 },
  { clinic_name: "PetCity Tähesaju Clinic", city: "Tallinn", address: "Mustakivi tee 17", phone: "+372 5 305 5622", opening_hours: "Mon-Sat 10-20, Sun 10-19", latitude: 59.442844, longitude: 24.862164 },
  { clinic_name: "NordicVet", city: "Tallinn", address: "Koskla 16", phone: "+372 5 554 5522", opening_hours: "Mon, Wed 9-19, Tue, Thur, Fri 9-17", latitude: 59.42576, longitude: 24.718779 },
  { clinic_name: "Miki Animal Clinic", city: "Tallinn", address: "J. Kunderi 37", phone: "+372 6 333 398", opening_hours: "Mon-Fri 9-18, Sat 9-15, Sun 10-15", latitude: 59.431575, longitude: 24.774128 },
  { clinic_name: "Haabersti Animal Clinic", city: "Tallinn", address: "Õismäe tee 115A", phone: "+372 5 080 660", opening_hours: "Mon–Fri 10-18", latitude: 59.412786, longitude: 24.638967 },
  { clinic_name: "Univet Animal Clinic", city: "Tallinn", address: "Kadaka tee 133", phone: "+372 5 886 7736", opening_hours: "Mon–Fri 9-18, Sat 9-16", latitude: 59.412368, longitude: 24.669601 },
  { clinic_name: "Evidensia Viimsi Animal Clinic", city: "Viimsi", address: "Paadi tee 3, Haabneeme", phone: "+372 6 006 675", opening_hours: "Mon–Fri 9–19", latitude: 59.503773, longitude: 24.826568 },
  { clinic_name: "Keila Animal Clinic", city: "Keila", address: "Jaama 11e", phone: "+372 6 705 243", opening_hours: "Mon–Fri 9-19, Sat 10-15", latitude: 59.308661, longitude: 24.415283 },
  { clinic_name: "Saue Animal Clinic", city: "Saue", address: "Sooja 1", phone: "+372 6 740 555", opening_hours: "Mon–Fri 15-19", latitude: 59.323063, longitude: 24.564926 },
  { clinic_name: "Laagri Animal Clinic", city: "Laagri", address: "Vae 2", phone: "+372 5 507 267", opening_hours: "Mon–Fri 10-18", latitude: 59.351389, longitude: 24.609892 },
  { clinic_name: "FIK Small Animal Clinic", city: "Tartu", address: "Mõisavahe 21", phone: "+372 7 333 234", opening_hours: "Mon–Fri 9:30-19, Sat 10-16", latitude: 58.37002, longitude: 26.775277 },
  { clinic_name: "Emajõe Animal Clinic", city: "Tartu", address: "Emajõe 1a", phone: "+372 5 854 0702", opening_hours: "Mon–Fri 9–19", latitude: 58.386618, longitude: 26.719912 },
  { clinic_name: "Tartu Väikeloomakliinik", city: "Tartu", address: "Aleksandri 8b", phone: "+372 5 258 012", opening_hours: "Mon–Fri 9-19, Sat 10-17", latitude: 58.375942, longitude: 26.73098 },
  { clinic_name: "PetCity Eedeni loomakliinik", city: "Tartu", address: "Kalda tee 1c", phone: "+372 5 213 557", opening_hours: "Mon-Sun 10-19", latitude: 58.373105, longitude: 26.750233 },
  { clinic_name: "PetCity Lõunakeskuse loomakliinik", city: "Tartu", address: "Lääne-Ringtee 35", phone: "+372 5 303 5388", opening_hours: "Mon-Sun 10-19", latitude: 58.34231, longitude: 26.732342 },
  { clinic_name: "Pärnu Small Animal Clinic", city: "Pärnu", address: "Tallinna mnt 77", phone: "+372 4 430 878", opening_hours: "Mon–Fri 9–19", latitude: 58.401063, longitude: 24.493221 },
  { clinic_name: "PetCity Pärnu Clinic", city: "Pärnu", address: "Aida 7, Pärnu Keskus", phone: "+372 5 333 1006", opening_hours: "Mon-Fri 9-20, Sat 10-20, Sun 10-18", latitude: 58.386898, longitude: 24.501691 },
  { clinic_name: "Narva Vet Animal Centre", city: "Narva", address: "Kreenholmi 9", phone: "+372 3 570 466", opening_hours: "Mon–Fri 9-17", latitude: 59.375692, longitude: 28.181894 },
  { clinic_name: "Pet City Astri Clinic", city: "Narva", address: "Tallinna mnt 41", phone: "+372 5 344 0485", opening_hours: "Mon–Fri 10-18", latitude: 59.381451, longitude: 28.175944 },
  { clinic_name: "Jõhvi VetProf Clinic", city: "Jõhvi", address: "Keskväljak 8", phone: "+372 3 341 350", opening_hours: "Mon–Fri 10- 18, Sat 10-15", latitude: 59.357622, longitude: 27.412749 },
  { clinic_name: "Järve VetProf Clinic", city: "Kohtla-Järve", address: "Järveküla tee 64", phone: "+372 3 320 140", opening_hours: "Mon–Fri 10- 18, Sat 10-15", latitude: 59.401668, longitude: 27.294454 },
  { clinic_name: "Evidensia Rakvere Clinic", city: "Rakvere", address: "Vabaduse 14", phone: "+372 3 227 707", opening_hours: "Mon–Fri", latitude: 59.340774, longitude: 26.366683 },
  { clinic_name: "PetCity Rakvere Clinic", city: "Rakvere", address: "Haljala tee 4", phone: "+372 5 241 485", opening_hours: "Mon-Sat 10-20, Sun 10-19", latitude: 59.364191, longitude: 26.340073 },
  { clinic_name: "Viljandi Männimäe Animal Clinic", city: "Viljandi", address: "Riia mnt 38", phone: "+372 4 337 653", opening_hours: "Mon–Fri 9-18, Sat 9-16", latitude: 58.35065, longitude: 25.581222 },
];
