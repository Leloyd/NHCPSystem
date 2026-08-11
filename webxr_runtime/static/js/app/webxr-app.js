import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

import { CollisionSystem } from './collision-system.js';
import { GazeTeleportSystem } from './gaze-teleport-system.js?v=20260811-direct-floor-gaze-10';
import { PhoneVrGazeSystem } from './phone-vr-gaze-system.js?v=20260811-vr-gaze-blocking-1';
import { InteractionRegistry } from './interaction-registry.js';
import { InteractionSystem } from './interaction-system.js?v=20260811-splat-interactions-1';
import { PlayerController } from './player-controller.js?v=20260811-vr-ui-quality-1';
import { UiController } from './ui-controller.js';
import { applyAssetTransform, isMobileLikeDevice } from './utils.js';

const DEFAULT_BG = 0x0f1114;
const IS_IOS_DEVICE = /iPad|iPhone|iPod/i.test(navigator.userAgent || '')
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const DOOR_INTERACTION_MAX_DISTANCE = 2.35;
const HOTSPOT_INTERACTION_MAX_DISTANCE = 1.85;
const HOTSPOT_HELPER_COLOR = 0xffd54a;
const HOTSPOT_HELPER_RADIUS = 0.07;
const UNDERGROUND_ZIP_NAME = 'underground.zip';
const MUSEUM_ZIP_NAME = 'museum.zip';
const MUSEUM_CONTENT_INTERACTION_MAX_DISTANCE = 2.35;
// Gaussian-splat ray hits can alternate at the feathered edge of a captured
// wall as the headset pose changes by a few millimetres. Require the same
// result twice before changing spatial UI visibility so controls do not flash
// while preserving the rule that real walls conceal content behind them.
const SPLAT_OCCLUSION_CONFIRMATION_CHECKS = 2;
// The individual museum hotspot artifacts use the original 1x exhibit size.
// Their larger shared carousel intentionally remains at its authored 2x scale.
const MUSEUM_CONTENT_DISPLAY_SIZE = 0.58;
const MUSEUM_CONTENT_FORWARD_TILT = THREE.MathUtils.degToRad(-12);
const MUSEUM_CONTENT_HOTSPOTS = {
  'museum-content-kabila': {
    position: [0.00, 1.00, 2.65],
    controlsAlongZ: true,
    entries: [
      {
        id: 'kabila',
        title: { tl: 'Ang Kabilang Buhay ng mga Filipino', en: 'The Afterlife of the Filipino' },
        textOnly: true,
        hideTitle: true,
        audio: {
          tl: '/360Hotspots/Kabila/ANG KABILANG BUHAY NG MGA FILIPINO - Dibuho ni Bryan Anthony Paraiso.mp3',
          en: '/360Hotspots/Kabila/THE AFTERLIFE OF THE FILIPINO - Painting by Bryan Anthony Paraiso.mp3',
        },
      },
    ],
  },
  'museum-content-maitum': {
    position: [-2.30, 1.00, 3.24],
    displayPosition: [-2.30, 0.75, 3.37],
    titlePosition: [0, 0.05, 0.09],
    subtitlePosition: [0, -0.25, 0.09],
    controlsAlongZ: true,
    entries: [
      {
        id: 'jar',
        title: { tl: 'Mga Banga ng Maitum', en: 'The Maitum Jars' },
        modelUrl: '/AR-Artifacts/Maitum/Maitum-10k.glb',
        rotation: [0, -90, 0],
        disableTilt: true,
        audio: {
          tl: '/360Hotspots/jar/MGA BANGA NG MAITUM.mp3',
          en: '/360Hotspots/jar/THE MAITUM JARS.mp3',
        },
      },
    ],
  },
  'museum-content-manunggul': {
    position: [-2.30, 1.00, 1.82],
    displayPosition: [-2.30, 0.75, 1.85],
    titlePosition: [0, 0.05, 0.09],
    subtitlePosition: [0, -0.25, 0.09],
    controlsAlongZ: true,
    entries: [
      {
        id: 'banga',
        title: { tl: 'Banga ng Manunggul', en: 'The Manunggul Jar' },
        modelUrl: '/AR-Artifacts/Banga/Banga-512(10k).glb',
        rotation: [0, 0, 0],
        disableTilt: true,
        audio: {
          tl: '/360Hotspots/Balanghay/Banga/ANG BANGA NG MANUNGGUL.mp3',
          en: '/360Hotspots/Balanghay/Banga/THE MANUNGGUL JAR.mp3',
        },
      },
    ],
  },
  'museum-content-balanghay': {
    position: [-2.07, 1.00, -1.91],
    entries: [
      {
        id: 'balanghay',
        title: { tl: 'Ang Balanghay', en: 'The Balanghay' },
        modelUrl: '/AR-Artifacts/Balanghay/Balanghay-512(10K).glb',
        rotation: [0, 0, 0],
        audio: {
          tl: '/360Hotspots/Balanghay/ANG BALANGHAY.mp3',
          en: '/360Hotspots/Balanghay/THE BALANGHAY.mp3',
        },
      },
    ],
  },
  'museum-content-kabaong': {
    position: [-2.93, 1.00, -0.88],
    controlsAlongZ: true,
    entries: [
      {
        id: 'kabaong',
        title: { tl: 'Mga Nakabiting Kabaong ng Sagada', en: 'The Hanging Coffins of Sagada' },
        modelUrl: '/AR-Artifacts/Kabaong/Kabaong-512(10k).glb',
        rotation: [0, 0, 0],
        audio: {
          tl: '/360Hotspots/Kabaong/ANG MGA NAKABITING KABAONG NG SAGADA.mp3',
          en: '/360Hotspots/Kabaong/THE HANGING COFFINS OF SAGADA.mp3',
        },
      },
    ],
  },
  'museum-content-uloh': {
    position: [-1.00, 1.00, 0.32],
    controlsAlongZ: true,
    entries: [
      {
        id: 'uloh',
        title: { tl: 'Tradisyunal na Ulóh ng mga Ifugao', en: 'Traditional Ulóh of the Ifugao' },
        modelUrl: '/AR-Artifacts/Uloh/Uloh-512(10k).glb',
        rotation: [0, -90, 0],
        audio: {
          tl: '/360Hotspots/Uloh/TRADISYUNAL NA ULÓH NG MGA IFUGAO.mp3',
          en: '/360Hotspots/Uloh/TRADITIONAL ULÓH OF IFUGAO.mp3',
        },
      },
    ],
  },
  'museum-content-nagcarlan': {
    position: [-0.55, 1.00, 0.28],
    controlsAlongZ: true,
    entries: [
      {
        id: 'thenagcarlanundergroundcemetery',
        title: {
          tl: 'Libingan sa Ilalim ng Lupa ng Nagcarlan',
          en: 'The Nagcarlan Underground Cemetery',
        },
        imageUrl: '/images/InsideMuseum/The_Nagcarlan_Underground_Cemetery.png',
        audio: {
          tl: '/audio/landing-voice/T3 - AboutSite1.mp3',
          en: '/audio/landing-voice/E3 - AboutSite1.mp3',
        },
      },
    ],
  },
  'museum-content-huling-taludtod': {
    position: [0.10, 1.00, 0.89],
    entries: [
      {
        id: 'hulingtaludtod',
        title: { tl: 'Huling Taludtod', en: 'The Final Stanza' },
        imageUrl: '/images/InsideMuseum/HulingTaludtod.jpg',
        audio: {
          tl: '/audio/360VT/HULING_TALUDTOD.mp3',
          en: '/audio/360VT/THE_FINAL_STANZA.mp3',
        },
      },
    ],
  },
};
const MUSEUM_HOTSPOT_MARKERS = [
  {
    id: 'go-to-church',
    position: [0.67, 1.00, 0.00],
    color: 0x8fd3ff,
    radius: 0.07,
    interactionMaxDistance: HOTSPOT_INTERACTION_MAX_DISTANCE,
  },
  ...Object.entries(MUSEUM_CONTENT_HOTSPOTS).map(([id, content]) => ({
    id,
    position: content.position,
    color: HOTSPOT_HELPER_COLOR,
    radius: HOTSPOT_HELPER_RADIUS,
    interactionMaxDistance: MUSEUM_CONTENT_INTERACTION_MAX_DISTANCE,
  })),
];
// Museum is a splat-only capture (no .glb collision meshes), so these bounds
// retain its floor height while the calibrated open segments limit travel.
// ?spawn=x,y,z overrides the start position live for quick calibration.
const MUSEUM_SPAWN_POINT = [0.5, 0.0, 0.07];
const MUSEUM_SPAWN_YAW = Math.PI / 2; // Face toward negative X.
const MUSEUM_FALLBACK_BOUNDS = { min: [-13, 0, -21], max: [4, 5, 5] };
const MUSEUM_WALK_BOUNDARY_SEGMENTS = [
  [[0.67, -0.35], [0.67, 0.90]],
  [[0.67, 0.90], [-0.55, 0.90]],
  [[-0.55, 0.90], [-0.55, -0.45]],
  [[-0.55, -0.45], [-1.00, -0.50]],
  [[-1.00, -0.50], [-1.00, 1.50]],
  [[-1.00, 1.50], [-0.30, 1.50]],
  [[-0.30, 1.50], [0.24, 2.10]],
  [[0.24, 2.10], [0.24, 3.14]],
  [[0.24, 3.14], [-0.25, 3.81]],
  [[-0.25, 3.81], [-1.10, 3.81]],
  [[-1.10, 3.81], [-1.10, 4.40]],
  [[-1.10, 4.40], [0.30, 4.40]],
  [[0.19, 4.40], [0.19, 6.15]],
  [[0.19, 6.15], [-0.23, 6.15]],
  [[-0.23, 6.15], [-0.23, 7.53]],
  [[-0.23, 7.53], [-2.77, 7.53]],
  [[-2.77, 7.53], [-2.77, 5.94]],
  [[-2.77, 5.94], [-3.16, 5.94]],
  [[-3.16, 5.94], [-3.16, 4.33]],
  [[-3.16, 4.33], [-2.00, 4.33]],
  [[-2.00, 4.33], [-2.00, 3.72]],
  [[-2.00, 3.72], [-2.30, 3.72]],
  [[-2.30, 3.72], [-2.30, 0.83]],
  [[-2.30, 0.83], [-2.93, 0.83]],
  [[-2.93, 0.83], [-2.93, -1.91]],
  [[-2.93, -1.91], [-1.10, -1.91]],
  [[-1.10, -1.91], [-1.10, -1.46]],
  [[-1.10, -1.46], [-0.55, -1.46]],
  [[-0.55, -1.46], [-0.55, -1.80]],
  [[-0.55, -1.80], [0.34, -1.80]],
  [[0.34, -1.80], [0.34, -0.35]],
  [[0.34, -0.35], [0.67, -0.35]],
];
const WEBXR_PREFETCH_STORAGE_KEY = 'webxrSceneMetadataPrefetchV2';
const WEBXR_PREFETCH_MAX_AGE_MS = 8 * 60 * 1000;
const CHURCH_RETURN_SPAWN = [-3.7, -0.32, 2.5];
const UNDERGROUND_SPAWN_POINT = [3.15, -0.47, 0.0];
const CHURCH_MAX_POSITIVE_CLAMP = { x: 2.5, z: 2.5 };
const UNDERGROUND_MAX_POSITIVE_CLAMP = { x: 3.5, z: 2.5 };
const UNDERGROUND_FALLBACK_BOUNDS = {
  min: [-3.45, 0, -5.35],
  max: [3.65, 3.4, 2.65],
};
const UNDERGROUND_FLOOR_REGIONS = [
  {
    floorY: -0.1,
    points: [
      [-1.6, -5.1],
      [1.5, -5.1],
      [1.5, 1.1],
      [-1.6, 1.2],
    ],
  },
];
const UNDERGROUND_WALK_BOUNDARY = [
  [3.5, -0.7],
  [1.5, -0.7],
  [1.5, -5.2],
  [-1.6, -5.2],
  [-1.6, -0.4],
  [-3.2, -0.4],
  [-3.2, 1.0],
  [-1.6, 1.0],
  [-1.6, 2.5],
  [1.65, 2.5],
  [1.65, 0.7],
  [3.5, 0.7],
];
const CHURCH_HOTSPOT_MARKERS = [
  {
    id: 'hotspot-1',
    position: [-2.494, 0.343, -2.280],
    color: 0xd4af6a,
    radius: 0.07,
    interactionMaxDistance: HOTSPOT_INTERACTION_MAX_DISTANCE,
  },
  {
    id: 'hotspot-2',
    position: [-2.504, 0.345, -1.342],
    color: 0xd4af6a,
    radius: 0.07,
    interactionMaxDistance: HOTSPOT_INTERACTION_MAX_DISTANCE,
  },
  {
    id: 'hotspot-3',
    position: [-2.619, 0.334, 1.068],
    color: 0xd4af6a,
    radius: 0.07,
    interactionMaxDistance: HOTSPOT_INTERACTION_MAX_DISTANCE,
  },
  {
    id: 'hotspot-4',
    position: [-2.641, 0.339, 2.063],
    color: 0xd4af6a,
    radius: 0.07,
    interactionMaxDistance: HOTSPOT_INTERACTION_MAX_DISTANCE,
  },
  {
    id: 'go-to-museum',
    position: [-4.50, 0.50, -0.19],
    color: 0x8fd3ff,
    radius: 0.07,
    interactionMaxDistance: HOTSPOT_INTERACTION_MAX_DISTANCE,
  },
];
const UNDERGROUND_HOTSPOT_MARKERS = [
  {
    id: 'go-back-to-church',
    position: [3.5, 1.136, 0],
    color: 0x8fd3ff,
    radius: 0.07,
    interactionMaxDistance: DOOR_INTERACTION_MAX_DISTANCE,
  },
];
const MUSEUM_ARTIFACT_POSITION = [-1.64, 1.00, 6.22];
const MUSEUM_ARTIFACT_TOGGLE_POSITION = [-1.63, 0.75, 5.06];
const MUSEUM_ARTIFACT_INTERACTION_MAX_DISTANCE = 2.6;
const MUSEUM_ARTIFACT_DISPLAY_SIZE = 1.16;
const MUSEUM_ARTIFACT_FORWARD_TILT = THREE.MathUtils.degToRad(-8);
const MUSEUM_ARTIFACT_AUDIO_NEAR_DISTANCE = 0.75;
const MUSEUM_ARTIFACT_AUDIO_FAR_DISTANCE = 5.5;
const MUSEUM_ARTIFACT_AUDIO_MIN_VOLUME = 0.06;
const MUSEUM_ARTIFACTS = [
  {
    id: 'alay',
    title: { tl: 'Alay, Atang, Halad', en: 'Alay, Atang, Halad' },
    modelUrl: '/AR-Artifacts/Alay/Alay-512(10k).glb',
    rotation: [0, -90, 0],
    audio: {
      tl: '/360Hotspots/Alay/ALAY, ATANG, HALAD.mp3',
      en: '/360Hotspots/Alay/ALAY, ATANG, HALAD(English).mp3',
    },
  },
  {
    id: 'antuk',
    title: { tl: 'Antuk at Ulahing', en: 'Antuk and Ulahing' },
    modelUrl: '/AR-Artifacts/Antuk/Antuk-512(10k).glb',
    rotation: [0, -90, 0],
    audio: {
      tl: '/360Hotspots/Antuk/ANTUK AT ULAHING NG MGA ATA-MANOBO.mp3',
      en: '/360Hotspots/Antuk/ANTUK AND ULAHING OF THE ATA-MANOBO.mp3',
    },
  },
  {
    id: 'bagongon',
    title: { tl: 'Bagongon ng mga Ilokano', en: 'Bagongon of the Ilocano' },
    modelUrl: '/AR-Artifacts/Bagongon/Bagongon-512(10k).glb',
    rotation: [0, -90, 0],
    audio: {
      tl: '/360Hotspots/Bagongon/BAGONGON NG MGA ILOKANO.mp3',
      en: '/360Hotspots/Bagongon/BAGONGON OF THE ILOCANO.mp3',
    },
  },
  {
    id: 'bogwa',
    title: { tl: 'Bogwa ng mga Ifugao', en: 'Bogwa of the Ifugao' },
    modelUrl: '/AR-Artifacts/Bogwa/Bogwa-512(10k).glb',
    rotation: [0, -130, 0],
    audio: {
      tl: '/360Hotspots/Bogwa/BOGWA NG MGA IFUGAO.mp3',
      en: '/360Hotspots/Bogwa/BOGWA OF THE IFUGAO.mp3',
    },
  },
  {
    id: 'kagamitan',
    title: { tl: 'Kagamitan ng mga Yumao sa Batanes', en: 'Belongings of the Dead in Batanes' },
    modelUrl: '/AR-Artifacts/Kagamitan/Kagamitan-512(10k).glb',
    rotation: [0, -90, 0],
    audio: {
      tl: '/360Hotspots/Kagamitan/MGA KAGAMITAN NG MGA YUMAO SA BATANES.mp3',
      en: '/360Hotspots/Kagamitan/BELONGINGS OF THE DEAD IN BATANES.mp3',
    },
  },
  {
    id: 'luksa',
    title: { tl: 'Mga Taga-luksa', en: 'The Mourners' },
    modelUrl: '/AR-Artifacts/Luksa/Luksa-512(10k).glb',
    rotation: [0, -180, 0],
    audio: {
      tl: '/360Hotspots/Luksa/ANG MGA TAGA-LUKSA SA BUROL NG MGA FILIPINONG-TSINO.mp3',
      en: '/360Hotspots/Luksa/THE MOURNERS IN FILIPINO-CHINESE BURIAL.mp3',
    },
  },
  {
    id: 'pagpag',
    title: { tl: 'Ang Pagpag', en: 'The Custom of Pagpag' },
    modelUrl: '/AR-Artifacts/Pagpag/Pagpag-512(10k).glb',
    rotation: [0, -90, 0],
    audio: {
      tl: '/360Hotspots/Pagpag/ANG PAGPAG.mp3',
      en: '/360Hotspots/Pagpag/THE CUSTOM OF PAGPAG.mp3',
    },
  },
  {
    id: 'pagtubas',
    title: { tl: 'Pagtubas ng mga Waray', en: 'Pagtubas of the Waray' },
    modelUrl: '/AR-Artifacts/Pagtubas/Pagtubas-512(10k).glb',
    rotation: [0, -90, 0],
    audio: {
      tl: '/360Hotspots/Pagtubas/PAGTUBAS NG MGA WARAY.mp3',
      en: '/360Hotspots/Pagtubas/PAGTUBAS OF THE WARAY.mp3',
    },
  },
  {
    id: 'pahimakas',
    title: { tl: 'Pahimakas ni Julio Nakpil', en: 'Julio Nakpil\'s Pahimakas' },
    modelUrl: '/AR-Artifacts/Pahimakas/Pahimakas-512(10k).glb',
    rotation: [0, -90, 0],
    audio: {
      tl: '/360Hotspots/Pahimakas/PAHIMAKAS AT IBA PANG MARCHA FUNEBRE NI NAKPIL.mp3',
      en: '/360Hotspots/Pahimakas/NAKPIL_S PAHIMAKAS AND OTHER FUNERAL MARCHES.mp3',
    },
  },
  {
    id: 'pahiwatig',
    title: { tl: 'Mga Pahiwatig ng Kamatayan', en: 'Omens of Death' },
    modelUrl: '/AR-Artifacts/Pahiwatig/Pahiwating.glb',
    rotation: [0, -120, 0],
    audio: {
      tl: '/360Hotspots/Pahiwatig/MGA PAHIWATIG NG KAMATAYAN.mp3',
      en: '/360Hotspots/Pahiwatig/OMENS OF DEATH.mp3',
    },
  },
  {
    id: 'recuerdos',
    title: { tl: 'Recuerdos de Patay', en: 'Recuerdos de Patay' },
    modelUrl: '/AR-Artifacts/Recuerdos/Recuerdos-512(10k).glb',
    rotation: [0, -90, 0],
    audio: {
      tl: '/360Hotspots/Recuerdos/RECUERDOS DE PATAY.mp3',
      en: '/360Hotspots/Recuerdos/RECUERDOS DE PATAY(English).mp3',
    },
  },
  {
    id: 'sabwag',
    title: { tl: 'Sabwag ng mga Bikolnon', en: 'Sabwag of the Bikolnon' },
    modelUrl: '/AR-Artifacts/Sabwag/Sabwag-512(10k).glb',
    rotation: [0, -90, 0],
    audio: {
      tl: '/360Hotspots/Sabwag/SABWAG NG MGA BIKOLNON.mp3',
      en: '/360Hotspots/Sabwag/SABWAG OF THE BIKOLNON.mp3',
    },
  },
  {
    id: 'sisiw',
    title: { tl: 'Sisiw ng Budhi', en: 'Hatchling of Conscience' },
    modelUrl: '/AR-Artifacts/Sisiw/Sisiw-512(10k).glb',
    rotation: [0, 0, 0],
    audio: {
      tl: '/360Hotspots/Sisiw/SISIW NG BUDHI.mp3',
      en: '/360Hotspots/Sisiw/HATCHLING OF CONSCIENCE.mp3',
    },
  },
  {
    id: 'tausug-1',
    subtitleKey: 'tausug',
    title: { tl: 'Paglilibing ng mga Tausug I', en: 'Tausug Burial Practices I' },
    modelUrl: '/AR-Artifacts/Tausug/Tausug1-512(10k).glb',
    rotation: [0, -90, 0],
    audio: {
      tl: '/360Hotspots/Tausug/KAUGALIAN SA PAGLILIBING NG MGA TAUSUG.mp3',
      en: '/360Hotspots/Tausug/TAUSUG BURIAL PRACTICES.mp3',
    },
  },
  {
    id: 'tausug-2',
    subtitleKey: 'tausug',
    title: { tl: 'Paglilibing ng mga Tausug II', en: 'Tausug Burial Practices II' },
    modelUrl: '/AR-Artifacts/Tausug/Tausug2-512(10k).glb',
    rotation: [0, -90, 0],
    audio: {
      tl: '/360Hotspots/Tausug/KAUGALIAN SA PAGLILIBING NG MGA TAUSUG.mp3',
      en: '/360Hotspots/Tausug/TAUSUG BURIAL PRACTICES.mp3',
    },
  },
  {
    id: 'tausug-3',
    subtitleKey: 'tausug',
    title: { tl: 'Paglilibing ng mga Tausug III', en: 'Tausug Burial Practices III' },
    modelUrl: '/AR-Artifacts/Tausug/Tausug3-512(10k).glb',
    rotation: [0, -90, 0],
    audio: {
      tl: '/360Hotspots/Tausug/KAUGALIAN SA PAGLILIBING NG MGA TAUSUG.mp3',
      en: '/360Hotspots/Tausug/TAUSUG BURIAL PRACTICES.mp3',
    },
  },
  {
    id: 'tausug-4',
    subtitleKey: 'tausug',
    title: { tl: 'Paglilibing ng mga Tausug IV', en: 'Tausug Burial Practices IV' },
    modelUrl: '/AR-Artifacts/Tausug/Tausug4-512(10k).glb',
    rotation: [0, -90, 0],
    audio: {
      tl: '/360Hotspots/Tausug/KAUGALIAN SA PAGLILIBING NG MGA TAUSUG.mp3',
      en: '/360Hotspots/Tausug/TAUSUG BURIAL PRACTICES.mp3',
    },
  },
  {
    id: 'tboli',
    title: { tl: 'Ang Kaluluwa ng mga T\'boli', en: 'The T\'boli Soul' },
    modelUrl: "/AR-Artifacts/Tboli/T'boli-512(10k).glb",
    rotation: [0, -90, 0],
    audio: {
      tl: '/360Hotspots/Tboli/ANG KALULUWA NG MGA T_BOLI.mp3',
      en: '/360Hotspots/Tboli/THE T_BOLI SOUL.mp3',
    },
  },
  {
    id: 'tsapang',
    title: { tl: 'Tsapang Itim ng Pagluluksa', en: 'Black Mourning Pins' },
    modelUrl: '/AR-Artifacts/Tsapang/Tsapang-512(10k).glb',
    rotation: [0, -90, 0],
    audio: {
      tl: '/360Hotspots/Tsapang/TSAPANG ITIM NG PAGLULUKSA.mp3',
      en: '/360Hotspots/Tsapang/BLACK MOURNING PINS.mp3',
    },
  },
];
const TABLE_IMAGE_BASE = '/images/360InsideChapel/';
const TABLE_AUDIO_BASE = '/audio/360VT/TableAudio/';
const tableAudio = (tl, en) => ({
  tl: tl ? `${TABLE_AUDIO_BASE}${tl}` : '',
  en: en ? `${TABLE_AUDIO_BASE}${en}` : '',
});
const CHURCH_HOTSPOT_TABLES = {
  'hotspot-1': {
    title: { en: 'Construction Materials', tl: 'Mga Materyales sa Konstruksyon' },
    imageUrl: `${TABLE_IMAGE_BASE}Art1-LeftTable.png`,
    imageAlt: 'Construction materials table',
    hotspots: [
      { id: 'art1-left-table-1', x: 14.40, y: 28.76, imageUrl: `${TABLE_IMAGE_BASE}Artifact/ApogAdobe.png`, title: 'Lime Putty and Adobe Powder', audio: tableAudio('ApogAdobe-T.mp3', 'ApogAdobe-E.mp3') },
      { id: 'art1-left-table-2', x: 13.70, y: 50.00, imageUrl: `${TABLE_IMAGE_BASE}Artifact/LimeSand.png`, title: 'Lime Putty and Sand', audio: tableAudio('ApogSand-T.mp3', 'ApogSand-E.mp3') },
      { id: 'art1-left-table-3', x: 13.28, y: 71.24, imageUrl: `${TABLE_IMAGE_BASE}Artifact/LimeCoral.png`, title: 'Lime Putty and Coral Powder', audio: tableAudio('ApogCoral-T.mp3', 'ApogCoral-E.mp3') },
      { id: 'art1-left-table-4', x: 58.74, y: 39.13, imageUrl: `${TABLE_IMAGE_BASE}Artifact/Limestone.png`, title: 'Limestone', audio: tableAudio('Batong-Apog-T.mp3', 'Batong-Apog-E.mp3') },
      { id: 'art1-left-table-5', x: 58.46, y: 78.82, imageUrl: `${TABLE_IMAGE_BASE}Artifact/Brick.png`, title: 'Brick', audio: tableAudio('Ladrilyo-T.mp3', 'Ladrilyo-E.mp3') },
      { id: 'art1-left-table-6', x: 84.62, y: 78.06, imageUrl: `${TABLE_IMAGE_BASE}Artifact/Adobe.png`, title: 'Adobe', audio: tableAudio('Adobe-T.mp3', 'Adobe-E.mp3') },
      { id: 'art1-left-table-7', x: 83.79, y: 36.35, imageUrl: `${TABLE_IMAGE_BASE}Artifact/CoralStone.png`, title: 'Coral Stone', audio: tableAudio('CoralStone-T.mp3', 'CoralStone-E.mp3') },
    ],
  },
  'hotspot-2': {
    title: { en: 'Wood and Structural Elements', tl: 'Kahoy at mga Elementong Istruktural' },
    imageUrl: `${TABLE_IMAGE_BASE}Art2-LeftTable.png`,
    imageAlt: 'Wood and structural elements table',
    hotspots: [
      { id: 'art2-left-table-1', x: 23.77, y: 21.26, imageUrl: `${TABLE_IMAGE_BASE}Artifact3/molave.png`, title: 'Molave', audio: tableAudio('Molave-T.mp3', 'Molave-E.mp3') },
      { id: 'art2-left-table-2', x: 23.28, y: 48.22, imageUrl: `${TABLE_IMAGE_BASE}Artifact3/Narra.png`, title: 'Narra', audio: tableAudio('Narra-T.mp3', 'Narra-E.mp3') },
      { id: 'art2-left-table-3', x: 23.42, y: 75.69, imageUrl: `${TABLE_IMAGE_BASE}Artifact3/KatongMatsing.png`, title: 'Katong Matsing', audio: tableAudio('Katong-Matsing-T.mp3', 'Katong-Matsing-E.mp3') },
      { id: 'art2-left-table-4', x: 45.66, y: 32.45, imageUrl: `${TABLE_IMAGE_BASE}Artifact3/Kamagong.png`, title: 'Kamagong', audio: tableAudio('Kamagong-T.mp3', 'Kamagong-E.mp3') },
      { id: 'art2-left-table-5', x: 45.80, y: 66.28, imageUrl: `${TABLE_IMAGE_BASE}Artifact3/Yakal.png`, title: 'Yakal', audio: tableAudio('Yakal-T.mp3', 'Yakal-E.mp3') },
      { id: 'art2-left-table-6', x: 62.31, y: 55.60, imageUrl: `${TABLE_IMAGE_BASE}Artifact3/BatikulingWHR.png`, title: 'Batikuling WHR', audio: tableAudio('Batikuling-T.mp3', 'Batikuling-E.mp3') },
      { id: 'art2-left-table-7', x: 74.76, y: 53.56, imageUrl: `${TABLE_IMAGE_BASE}Artifact3/Headrest.png`, title: 'Headrest', audio: tableAudio('Headrest-T.mp3', 'Headrest-E.mp3') },
      { id: 'art2-left-table-8', x: 75.46, y: 87.14, imageUrl: `${TABLE_IMAGE_BASE}Artifact3/IronNail.png`, title: 'Iron Nail', audio: tableAudio('IronNail-T.mp3', 'IronNail-E.mp3') },
    ],
  },
  'hotspot-3': {
    title: { en: 'Architectural Details', tl: 'Mga Detalye ng Arkitektura' },
    imageUrl: `${TABLE_IMAGE_BASE}Art1-RightTable.png`,
    imageAlt: 'Architectural details table',
    hotspots: [
      { id: 'art1-right-table-1', x: 27.20, y: 52.56, imageUrl: `${TABLE_IMAGE_BASE}Artifact2/AzulejosTile.png`, title: 'Azulejos Tile', audio: tableAudio('Azulejos-T.mp3', 'Azulejos-E.mp3') },
      { id: 'art1-right-table-2', x: 48.46, y: 29.74, imageUrl: `${TABLE_IMAGE_BASE}Artifact2/RightWindow.png`, title: 'Right Window', audio: tableAudio('Right Window(T).mp3', 'Right Window.mp3') },
      { id: 'art1-right-table-3', x: 47.90, y: 56.52, imageUrl: `${TABLE_IMAGE_BASE}Artifact2/ChapelCeiling.png`, title: 'Chapel Ceiling', audio: tableAudio('Chapel Ceiling(T).mp3', 'Chapel Ceiling.mp3') },
      { id: 'art1-right-table-4', x: 69.59, y: 30.90, imageUrl: `${TABLE_IMAGE_BASE}Artifact2/PigmentAboveNiche.png`, title: 'Pigment Above Niche', audio: tableAudio('Pigment Above Niche(T).mp3', 'Pigment Above Niche.mp3') },
      { id: 'art1-right-table-5', x: 69.45, y: 56.29, imageUrl: `${TABLE_IMAGE_BASE}Artifact2/BasReliefNiche.png`, title: 'Bas-Relief Niche', audio: tableAudio('Bas Relief Niche(T).mp3', 'Bas Relief Niche.mp3') },
    ],
  },
  'hotspot-4': {
    title: { en: 'Finishes and Mixtures', tl: 'Mga Palitada at Halo' },
    imageUrl: `${TABLE_IMAGE_BASE}Art2-RightTable.png`,
    imageAlt: 'Finishes, pigments, and mixtures table',
    hotspots: [
      { id: 'art2-right-table-1', x: 29.44, y: 18.22, imageUrl: `${TABLE_IMAGE_BASE}Artifact1/InteriorWall.png`, title: 'Interior Wall', audio: tableAudio('Interior Wall, Chapel(T).mp3', 'Interior Wall, Chapel.mp3') },
      { id: 'art2-right-table-2', x: 29.58, y: 38.40, imageUrl: `${TABLE_IMAGE_BASE}Artifact1/Flooring.png`, title: 'Flooring', audio: tableAudio('Flooring, Crypt(T).mp3', 'Flooring, Crypt.mp3') },
      { id: 'art2-right-table-3', x: 29.58, y: 56.56, imageUrl: `${TABLE_IMAGE_BASE}Artifact1/Pilaster.png`, title: 'Pilaster', audio: tableAudio('Pilaster (T).mp3', 'Pilaster.mp3') },
      { id: 'art2-right-table-4', x: 29.02, y: 73.96, imageUrl: `${TABLE_IMAGE_BASE}Artifact1/PerimeterWall.png`, title: 'Perimeter Wall', audio: tableAudio('Perimeter Wall(T).mp3', 'Perimeter Wall.mp3') },
      { id: 'art2-right-table-5', x: 40.49, y: 19.73, imageUrl: `${TABLE_IMAGE_BASE}Artifact1/Pigments.png`, title: 'Pigments', audio: tableAudio('Mga Kulay Pigments.mp3', 'Mga Kulay Pigments(E).mp3') },
      { id: 'art2-right-table-6', x: 40.49, y: 73.21, imageUrl: `${TABLE_IMAGE_BASE}Artifact1/Artist_sMarterials.png`, title: "Artist's Materials", audio: tableAudio('Mga Kagamitan sa Pagdisenyo.mp3', 'Mga Kagamitan sa Pagdisenyo(E).mp3') },
      { id: 'art2-right-table-7', x: 70.56, y: 36.89, imageUrl: `${TABLE_IMAGE_BASE}Artifact1/CoralPowder.png`, title: 'Coral Powder', audio: tableAudio('Pulbos na Koral.mp3', 'Pulbos na Koral(E).mp3') },
      { id: 'art2-right-table-8', x: 80.92, y: 37.64, imageUrl: `${TABLE_IMAGE_BASE}Artifact1/AdobePowder.png`, title: 'Adobe Powder', audio: tableAudio('Pulbos na Adobe.mp3', 'Pulbos na Adobe(E).mp3') },
      { id: 'art2-right-table-9', x: 91.55, y: 38.40, imageUrl: `${TABLE_IMAGE_BASE}Artifact1/BrickPowder.png`, title: 'Brick Powder', audio: tableAudio('Pulbos na Ladrilyo.mp3', 'Pulbos na Ladrilyo(E).mp3') },
      { id: 'art2-right-table-10', x: 73.92, y: 70.43, imageUrl: `${TABLE_IMAGE_BASE}Artifact1/Lime.png`, title: 'Lime', audio: tableAudio('Apog.mp3', 'Apog(E).mp3') },
      { id: 'art2-right-table-11', x: 85.53, y: 70.69, imageUrl: `${TABLE_IMAGE_BASE}Artifact1/Sand.png`, title: 'Sand', audio: tableAudio('Buhangin.mp3', 'Buhangin(E).mp3') },
    ],
  },
};
const CHAPEL_CONSERVATION_STORAGE_KEY = 'nhcpChapelConservationV1';
const CHAPEL_CONSERVATION_STATIONS = ['hotspot-1', 'hotspot-2', 'hotspot-3', 'hotspot-4'];
const CHAPEL_CONSERVATION_FINDINGS = {
  'hotspot-1': {
    en: 'Historic masonry depends on compatible stone, brick, lime, sand, and mineral aggregates.',
    tl: 'Nakasalalay ang makasaysayang masonriya sa magkakatugmang bato, ladrilyo, apog, buhangin, at mineral na halo.',
  },
  'hotspot-2': {
    en: 'Durable local hardwoods and iron fasteners reveal how structural and movable elements were assembled.',
    tl: 'Ipinakikita ng matitibay na lokal na kahoy at pakong bakal kung paano binuo ang mga elementong istruktural at naililipat.',
  },
  'hotspot-3': {
    en: 'Tiles, windows, ceilings, pigments, and relief work carry both artistic and architectural evidence.',
    tl: 'Ang mga baldosa, bintana, kisame, pigment, at reliebo ay nagtataglay ng ebidensiyang pansining at pang-arkitektura.',
  },
  'hotspot-4': {
    en: 'Walls and finishes preserve traces of lime, sand, powdered masonry, pigments, and the makers’ techniques.',
    tl: 'Nananatili sa mga pader at palitada ang bakas ng apog, buhangin, pinulbos na masonriya, pigment, at pamamaraan ng mga gumawa.',
  },
};
const HERITAGE_MISSION_STORAGE_KEY = 'nhcpHeritageInvestigatorV1';
const HERITAGE_MISSION_VERSION = 1;
const HERITAGE_MISSION_CHAPEL_IDS = [];
const HERITAGE_MISSION_TIMELINE = [
  'evidence-revolution',
  'evidence-biak-na-bato',
  'evidence-world-war-ii',
  'evidence-guerrillas',
];
const HERITAGE_MISSION_EVIDENCE = {
  'evidence-revolution': {
    year: '1896',
    title: { en: 'Revolution Against Spain', tl: 'Rebolusyon Laban sa Espanya' },
    imageUrl: `${TABLE_IMAGE_BASE}Cemetery_and_Revolution.png`,
    imageAlt: 'Nagcarlan Underground Cemetery and the Philippine Revolution',
    text: {
      en: 'The underground chambers became a discreet meeting place for Katipuneros during the revolution against Spain.',
      tl: 'Naging lihim na tagpuan ng mga Katipunero ang mga silid sa ilalim ng lupa noong rebolusyon laban sa Espanya.',
    },
  },
  'evidence-biak-na-bato': {
    year: '1897',
    title: { en: 'Road to Biak-na-Bato', tl: 'Landas Patungong Biak-na-Bato' },
    imageUrl: `${TABLE_IMAGE_BASE}Pact.png`,
    imageAlt: 'Philippine commissioners associated with the Pact of Biak-na-Bato',
    text: {
      en: 'Pedro Paterno and General Severino Taiño met secretly here as discussions developed toward the Pact of Biak-na-Bato.',
      tl: 'Lihim na nagpulong dito sina Pedro Paterno at Heneral Severino Taiño habang umuusad ang mga usaping humantong sa Kasunduan sa Biak-na-Bato.',
    },
  },
  'evidence-world-war-ii': {
    year: '1941–1945',
    title: { en: 'Second World War', tl: 'Ikalawang Digmaang Pandaigdig' },
    imageUrl: `${TABLE_IMAGE_BASE}World_War_II.png`,
    imageAlt: 'Nagcarlan Underground Cemetery during the Second World War',
    text: {
      en: 'During the Japanese occupation, the cemetery and the surrounding landscape formed part of the community’s wartime memory.',
      tl: 'Sa panahon ng pananakop ng mga Hapones, naging bahagi ng alaala ng pamayanan sa digmaan ang sementeryo at ang nakapaligid na lupain.',
    },
  },
  'evidence-guerrillas': {
    year: '1945',
    title: { en: 'Guerrillas of Nagcarlan', tl: 'Mga Gerilya ng Nagcarlan' },
    imageUrl: `${TABLE_IMAGE_BASE}Nagcarlan_Guerillas.png`,
    imageAlt: 'Filipino guerrillas in Nagcarlan in 1945',
    text: {
      en: 'Nagcarlan guerrilla groups resisted the occupation through mountain operations, sabotage, and intelligence work for Allied forces.',
      tl: 'Lumaban ang mga pangkat-gerilya ng Nagcarlan sa pamamagitan ng mga operasyon sa kabundukan, pagsabotahe, at paghahatid ng impormasyon sa mga Allied.',
    },
  },
};
const HERITAGE_MISSION_EVIDENCE_TABLES = Object.fromEntries(
  Object.entries(HERITAGE_MISSION_EVIDENCE).map(([id, evidence]) => [id, {
    title: evidence.title,
    imageUrl: evidence.imageUrl,
    imageAlt: evidence.imageAlt,
    hotspots: [],
  }]),
);
const HOTSPOT_TABLES = {
  ...CHURCH_HOTSPOT_TABLES,
  ...HERITAGE_MISSION_EVIDENCE_TABLES,
};
// Chapel table images belong inside the spatial viewer and must remain hidden
// until their OPEN marker is selected. Only mission evidence keeps the older
// floating preview-label treatment.
const HOTSPOT_FLOATING_LABEL_IMAGES = Object.fromEntries(
  Object.entries(HERITAGE_MISSION_EVIDENCE_TABLES)
    .map(([id, table]) => [id, table.imageUrl]),
);
const QUALITY_PRESETS = {
  auto: {
    pixelRatio: () => Math.min(window.devicePixelRatio || 1, isMobileLikeDevice() ? 1.2 : 1.6),
    splatLodScale: 1.0,
  },
  low: {
    pixelRatio: () => 0.9,
    splatLodScale: 1.35,
  },
  medium: {
    pixelRatio: () => Math.min(window.devicePixelRatio || 1, 1.25),
    splatLodScale: 1.0,
  },
  high: {
    pixelRatio: () => Math.min(window.devicePixelRatio || 1, 2.0),
    splatLodScale: 0.75,
  },
};
const XR_SESSION_MODE_VR = 'immersive-vr';

export class WebXRApp {
  constructor({ container, refs }) {
    this.container = container;
    this.refs = refs;

    this.metadata = null;
    this.requestedScene = String(this.container?.dataset?.webxrScene || '').trim().toLowerCase() || null;
    this.requestedZipOverride = this._readZipOverrideFromUrl();
    this.requestedSpawnOverride = this._readSpawnOverrideFromUrl();
    this.hotspotDebugRequested = new URLSearchParams(window.location.search).get('hotspotDebug') === '1';

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(DEFAULT_BG);

    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 3000);

    this.renderer = new THREE.WebGLRenderer({
      // Gaussian splats do not benefit from WebGL MSAA. In immersive VR it
      // allocates the multisampled stereo targets twice and can exhaust a
      // phone GPU, leaving Google's VR compositor visible but entirely black.
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.xr.enabled = true;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.clock = new THREE.Clock();
    this.labelProjection = new THREE.Vector3();
    this.hotspotOcclusionRaycaster = new THREE.Raycaster();
    this.hotspotOcclusionRaycaster.firstHitOnly = true;
    this.hotspotOcclusionOrigin = new THREE.Vector3();
    this.hotspotOcclusionTarget = new THREE.Vector3();
    this.hotspotOcclusionDirection = new THREE.Vector3();
    this.hotspotOcclusionEyePosition = new THREE.Vector3();
    this.hotspotOcclusionEyeMatrix = new THREE.Matrix4();
    this.gazeTeleportOcclusionRaycaster = new THREE.Raycaster();
    this.gazeTeleportOcclusionRaycaster.firstHitOnly = true;
    this.gazeTeleportOcclusionDirection = new THREE.Vector3();
    this.hotspotOcclusionLastCheckedAt = 0;
    this.hotspotOcclusionIntervalMs = 140;

    this.playerRig = new THREE.Group();
    this.playerRig.name = 'player-rig';
    this.playerRig.add(this.camera);
    this.scene.add(this.playerRig);

    this.loadingManager = new THREE.LoadingManager();
    this.gltfLoader = new GLTFLoader(this.loadingManager);

    this.meshEntries = [];
    this.splatEntries = [];
    this.pickableMeshes = [];
    this.hotspotMarkers = [];
    this.floatingHotspotLabels = [];
    this.expandedHotspotOverlay = null;
    this.expandedHotspotOverlayImage = null;
    this.expandedHotspotOverlayCaption = null;
    this.expandedHotspotOverlayDescription = null;
    this.expandedHotspotOverlayToggle = null;
    this.expandedHotspotOverlayLanguage = null;
    this.expandedHotspotOverlayLayer = null;
    this.expandedHotspotOverlayDetail = null;
    this.expandedHotspotOverlayDetailImage = null;
    this.expandedHotspotOverlayDetailTitle = null;
    this.expandedHotspotTable = null;
    this.expandedHotspotId = '';
    this.expandedHotspotDetail = null;
    this.expandedHotspotLanguage = 'tl';
    this.expandedHotspotAudio = null;
    this.xrHotspotTableViewer = null;
    this.xrHotspotTableId = '';
    this.xrHotspotTableDetail = null;
    this.xrHotspotTablePinsVisible = true;
    this.xrHotspotTableSourceMarker = null;
    this.xrHotspotTableBillboardTarget = new THREE.Vector3();
    this.museumArtifactStation = {
      root: null,
      modelPivot: null,
      currentModel: null,
      controlsRoot: null,
      titleSprite: null,
      subtitleSprite: null,
      toggleSprite: null,
      languageSprite: null,
      subtitleToggleSprite: null,
      index: 0,
      isOpen: false,
      subtitlesOn: false,
      language: 'tl',
      audio: null,
      loadToken: 0,
      modelCache: new Map(),
      elapsed: 0,
    };
    this.museumContentViewer = {
      root: null,
      mediaRoot: null,
      currentMedia: null,
      titleSprite: null,
      subtitleSprite: null,
      previousSprite: null,
      nextSprite: null,
      languageSprite: null,
      subtitleToggleSprite: null,
      hotspotId: '',
      entries: [],
      index: 0,
      isOpen: false,
      subtitlesOn: true,
      language: 'tl',
      sourceMarker: null,
      audio: null,
      loadToken: 0,
      modelCache: new Map(),
      elapsed: 0,
      billboardTarget: new THREE.Vector3(),
    };

    this.sparkRenderer = null;
    this.SplatMeshCtor = null;

    this.interactionRegistry = new InteractionRegistry();

    this.uiController = new UiController(this.refs);
    this.mobileMode = isMobileLikeDevice();

    this.playerController = null;
    this.collisionSystem = null;
    this.interactionSystem = null;
    this.gazeTeleportSystem = null;
    this.phoneVrGazeSystem = null;
    this.activeXrReferenceSpaceType = null;
    this.activeXrSessionMode = null;
    this.xrLoadingPanel = null;
    this.xrLoadingPanelStartedAt = 0;
    this.xrFrameSubmitted = false;
    this.xrRenderFailure = null;
    this.xrPreviousSparkBudget = null;
    this.xrPreviousSparkVisibility = null;
    this.xrTargetSparkBudget = null;
    this.xrQualityStage = 0;
    this.xrSplatRevealIndex = 0;
    this.xrSplatRevealStartedAt = 0;
    this.xrSplatsFullyRevealedAt = 0;
    this.lastPositionDebugValue = '';
    this.hotspotDebugActive = false;
    this.sceneTransitionInProgress = false;
    this.chapelConservation = this._readChapelConservationState();
    this.chapelConservationOpen = false;
    this.chapelConservationToastTimer = 0;

    this.boundResize = this.onResize.bind(this);
    this.boundFullscreenChange = this._onFullscreenChange.bind(this);
    this.boundGlobalKeyDown = this._onGlobalKeyDown.bind(this);
  }

  async init() {
    try {
      this.container.appendChild(this.renderer.domElement);

      this._setupUi();
      this._setupChapelConservation();
      this._setupLights();
      this._registerInteractions();

      this.uiController.setLoadingProgress(0.05, 'Fetching scene metadata...');
      this.metadata = await this._fetchMetadata();

      this.uiController.clearError();

      const quality = this.metadata.quality?.default ?? 'auto';
      this.applyQuality(quality);

      await this._loadSparkRuntime();
      await this._loadSceneAssets();
      this._createHotspotMarkers();
      this._setupGameplaySystems();
      this._setupMuseumArtifactStation();
      this._updateChapelConservationUi();

      window.addEventListener('resize', this.boundResize);
      window.addEventListener('keydown', this.boundGlobalKeyDown);
      document.addEventListener('fullscreenchange', this.boundFullscreenChange);
      this.onResize();

      // Do not expose the native XR controls until every required SPZ has
      // initialized and the WebXR animation loop is already active. Entering
      // immersive-vr before this point opens Google's compositor with no
      // frames to present, which appears as a permanent black screen.
      this.uiController.setLoadingProgress(0.97, 'Preparing VR renderer...');
      this.renderer.setAnimationLoop(this._animate.bind(this));
      this._setupXrUi();
      this.uiController.completeLoading('Scene ready.');
    } catch (error) {
      console.error('[startup] failed', error);
      this.uiController.showError(`Startup failed: ${error?.message ?? error}`);
      this.uiController.setLoadingProgress(1, 'Failed to start scene. Check console.');
      throw error;
    }
  }

  _setupUi() {
    this.uiController.bindHandlers({
      onBackRequested: () => this._handleBackRequested(),
      onFullscreenToggled: () => {
        void this._toggleFullscreen();
      },
      onGyroToggled: () => {
        void this._toggleGyroLook();
      },
    });

    this.uiController.setMobileControlsVisible(true);
    this.uiController.setFullscreenState(Boolean(document.fullscreenElement));

    // Gyro remains available as a normal-screen look control on supported phones.
    const gyroCapable = typeof window.DeviceOrientationEvent !== 'undefined'
      && (this.mobileMode || Boolean(window.matchMedia?.('(pointer: coarse)')?.matches));
    this.uiController.setGyroVisible(gyroCapable);

    this.refs.positionDebugCopy?.addEventListener('click', () => {
      if (this.hotspotDebugActive) {
        const value = this.refs.positionDebugValue?.textContent?.trim();
        if (value && value.startsWith('[')) {
          console.info(`[churchHotspotDebug] position: ${value}`);
        }
      }
    });
  }

  _createDefaultChapelConservationState() {
    return {
      version: 1,
      language: 'tl',
      examined: [],
      completed: false,
    };
  }

  _readChapelConservationState() {
    const fallback = this._createDefaultChapelConservationState();
    try {
      const parsed = JSON.parse(window.localStorage.getItem(CHAPEL_CONSERVATION_STORAGE_KEY) || 'null');
      if (!parsed || parsed.version !== 1) {
        return fallback;
      }
      return {
        ...fallback,
        language: parsed.language === 'en' ? 'en' : 'tl',
        examined: Array.isArray(parsed.examined)
          ? parsed.examined.filter((id) => CHAPEL_CONSERVATION_STATIONS.includes(id))
          : [],
        completed: parsed.completed === true,
      };
    } catch (error) {
      console.warn('[conservation] Could not read saved notebook progress.', error);
      return fallback;
    }
  }

  _saveChapelConservationState() {
    try {
      window.localStorage.setItem(
        CHAPEL_CONSERVATION_STORAGE_KEY,
        JSON.stringify(this.chapelConservation),
      );
    } catch (error) {
      console.warn('[conservation] Could not save notebook progress.', error);
    }
  }

  _conservationText(tl, en) {
    return this.chapelConservation.language === 'en' ? en : tl;
  }

  _setupChapelConservation() {
    const {
      conservationButton,
      conservationClose,
      conservationLanguage,
      conservationContent,
    } = this.refs;
    conservationButton?.addEventListener('click', () => {
      this._setChapelConservationOpen(!this.chapelConservationOpen);
    });
    conservationClose?.addEventListener('click', () => {
      this._setChapelConservationOpen(false);
      conservationButton?.focus({ preventScroll: true });
    });
    conservationLanguage?.addEventListener('click', () => {
      this.chapelConservation.language = this.chapelConservation.language === 'tl' ? 'en' : 'tl';
      this.expandedHotspotLanguage = this.chapelConservation.language;
      this._saveChapelConservationState();
      this._renderChapelConservation();
    });
    conservationContent?.addEventListener('click', (event) => {
      const action = event.target?.closest?.('[data-conservation-action]')?.dataset?.conservationAction;
      if (!action) {
        return;
      }
      if (action === 'choose-lime') {
        this.chapelConservation.completed = true;
        this._saveChapelConservationState();
        this._trackChapelConservation('learning_activity_completed', 'chapel-conservation', {
          score: 4,
          total: 4,
        });
        this._showChapelConservationToast(
          'Tama. Ang katugmang materyal at maingat na pagsusuri ang gabay sa konserbasyon.',
          'Correct. Compatible materials and careful assessment guide conservation.',
          5200,
        );
        this._renderChapelConservation();
        return;
      }
      if (action === 'choose-cement' || action === 'choose-coating') {
        this._showChapelConservationToast(
          'Suriing muli: maaaring makulong ang halumigmig at masira ang lumang masonriya kapag hindi tugma ang materyal.',
          'Review the evidence: incompatible materials can trap moisture and damage historic masonry.',
          5200,
        );
        return;
      }
      if (action === 'reset') {
        const language = this.chapelConservation.language;
        this.chapelConservation = this._createDefaultChapelConservationState();
        this.chapelConservation.language = language;
        this._saveChapelConservationState();
        this._renderChapelConservation();
        this._refreshChapelConservationMarkers();
      }
    });
    this._renderChapelConservation();
  }

  _setChapelConservationOpen(open) {
    const allowed = this._isChapelScene();
    this.chapelConservationOpen = Boolean(open && allowed);
    this.refs.conservationPanel?.classList.toggle('hidden', !this.chapelConservationOpen);
    this.refs.conservationPanel?.setAttribute('aria-hidden', String(!this.chapelConservationOpen));
    this.refs.conservationButton?.classList.toggle('is-active', this.chapelConservationOpen);
    this.refs.conservationButton?.setAttribute('aria-expanded', String(this.chapelConservationOpen));
    if (this.chapelConservationOpen) {
      this._renderChapelConservation();
    }
  }

  _updateChapelConservationUi() {
    const isChapel = this._isChapelScene();
    this.refs.conservationButton?.classList.toggle('hidden', !isChapel);
    if (!isChapel) {
      this._setChapelConservationOpen(false);
    }
    this._renderChapelConservation();
    this._refreshChapelConservationMarkers();
  }

  _renderChapelConservation() {
    const { conservationContent, conservationBadge } = this.refs;
    if (!conservationContent) {
      return;
    }
    const language = this.chapelConservation.language;
    const examined = new Set(this.chapelConservation.examined);
    const count = examined.size;
    if (conservationBadge) {
      conservationBadge.textContent = this.chapelConservation.completed ? '✓' : `${count}/4`;
      conservationBadge.classList.toggle('is-complete', this.chapelConservation.completed);
    }
    if (this.refs.conservationLanguage) {
      this.refs.conservationLanguage.textContent = language === 'tl' ? 'TL' : 'EN';
      this.refs.conservationLanguage.setAttribute(
        'aria-label',
        language === 'tl' ? 'Switch notebook to English' : 'Ilipat ang talaan sa Tagalog',
      );
    }
    if (this.refs.conservationKicker) {
      this.refs.conservationKicker.textContent = this._conservationText('Tala sa kapilya', 'Chapel field record');
    }
    if (this.refs.conservationTitle) {
      this.refs.conservationTitle.textContent = this._conservationText('Talaan ng Konserbasyon', 'Conservation Notebook');
    }

    const stationRows = CHAPEL_CONSERVATION_STATIONS.map((id, index) => {
      const table = CHURCH_HOTSPOT_TABLES[id];
      const complete = examined.has(id);
      const finding = CHAPEL_CONSERVATION_FINDINGS[id]?.[language] || '';
      return `
        <li class="conservation-station ${complete ? 'is-examined' : ''}">
          <span class="conservation-station__number">${complete ? '✓' : String(index + 1).padStart(2, '0')}</span>
          <div><strong>${table.title[language] || table.title.en}</strong><small>${complete ? finding : this._conservationText('Buksan ang mesa at siyasatin ang isang detalye.', 'Open the table and inspect one detail.')}</small></div>
        </li>`;
    }).join('');

    let closingSection = `
      <p class="conservation-notebook__instruction">${this._conservationText(
        'Siyasatin ang apat na mesa. Ang isang tala ay makukumpleto lamang kapag binuksan mo ang isa sa mga materyal o detalye nito.',
        'Investigate all four tables. A record is completed only after you open one of its materials or details.',
      )}</p>`;
    if (count === CHAPEL_CONSERVATION_STATIONS.length && !this.chapelConservation.completed) {
      closingSection = `
        <section class="conservation-decision">
          <span>${this._conservationText('Panghuling pasiya', 'Final decision')}</span>
          <h3>${this._conservationText('Aling lapit ang pinakaligtas na panimulang gabay para sa pag-aayos ng makasaysayang masonriya?', 'Which approach is the safest starting guide for repairing historic masonry?')}</h3>
          <div class="conservation-decision__choices">
            <button type="button" data-conservation-action="choose-lime">${this._conservationText('Katugmang halo na may apog', 'Compatible lime-based mixture')}</button>
            <button type="button" data-conservation-action="choose-cement">${this._conservationText('Matigas na Portland cement', 'Hard Portland cement')}</button>
            <button type="button" data-conservation-action="choose-coating">${this._conservationText('Hindi makahingang sintetikong coating', 'Impermeable synthetic coating')}</button>
          </div>
        </section>`;
    } else if (this.chapelConservation.completed) {
      closingSection = `
        <section class="conservation-decision conservation-decision--complete">
          <span>${this._conservationText('Tapos ang pagsisiyasat', 'Investigation complete')}</span>
          <h3>${this._conservationText('Panatilihin ang materyal, patunay, at pamamaraan—hindi lamang ang hitsura.', 'Preserve the material, evidence, and craft—not only the appearance.')}</h3>
          <p>${this._conservationText('Sa aktuwal na konserbasyon, kailangang kumpirmahin ng mga kwalipikadong conservator ang kondisyon at angkop na halo bago ang anumang interbensiyon.', 'In actual conservation work, qualified conservators must confirm the condition and compatible treatment before any intervention.')}</p>
          <button class="conservation-notebook__reset" type="button" data-conservation-action="reset">${this._conservationText('Ulitin ang pagsisiyasat', 'Restart investigation')}</button>
        </section>`;
    }

    conservationContent.innerHTML = `
      <p class="conservation-notebook__lead">${this._conservationText('Ikaw ang tagapagsiyasat ng kapilya. Basahin ang mga pisikal na bakas bago magpasya kung paano ito pangangalagaan.', 'You are the chapel investigator. Read its physical evidence before deciding how it should be cared for.')}</p>
      <div class="conservation-notebook__progress"><span style="width:${count * 25}%"></span></div>
      <p class="conservation-notebook__count">${this._conservationText(`${count} sa 4 na tala ang nasuri`, `${count} of 4 records examined`)}</p>
      <ol class="conservation-stations">${stationRows}</ol>
      ${closingSection}`;
  }

  _recordChapelConservationEvidence(stationId, detailId = '') {
    if (!this._isChapelScene() || !CHAPEL_CONSERVATION_STATIONS.includes(stationId)) {
      return;
    }
    if (this.chapelConservation.examined.includes(stationId)) {
      return;
    }
    this.chapelConservation.examined.push(stationId);
    this._saveChapelConservationState();
    this._trackChapelConservation('conservation_evidence_examined', detailId || stationId, {
      station: stationId,
      score: this.chapelConservation.examined.length,
      total: CHAPEL_CONSERVATION_STATIONS.length,
    });
    this._renderChapelConservation();
    this._refreshChapelConservationMarkers();
    this._showChapelConservationToast(
      `Naitala ang ebidensiya (${this.chapelConservation.examined.length}/4).`,
      `Evidence recorded (${this.chapelConservation.examined.length}/4).`,
    );
  }

  _showChapelConservationToast(tl, en, duration = 3200) {
    const toast = this.refs.conservationToast;
    if (!toast) {
      return;
    }
    window.clearTimeout(this.chapelConservationToastTimer);
    toast.textContent = this._conservationText(tl, en);
    toast.classList.remove('hidden');
    this.chapelConservationToastTimer = window.setTimeout(() => {
      toast.classList.add('hidden');
    }, duration);
  }

  _refreshChapelConservationMarkers() {
    const examined = new Set(this.chapelConservation.examined);
    this.hotspotMarkers.forEach((marker) => {
      if (!CHAPEL_CONSERVATION_STATIONS.includes(marker.name)) {
        return;
      }
      const complete = examined.has(marker.name);
      marker.userData.conservationExamined = complete;
      marker.scale.setScalar(complete ? 0.84 : 1);
    });
    this.floatingHotspotLabels.forEach((label) => {
      if (CHAPEL_CONSERVATION_STATIONS.includes(label.hotspotId)) {
        label.element?.classList.toggle('is-collected', examined.has(label.hotspotId));
      }
    });
  }

  _trackChapelConservation(eventName, targetId, extra = {}) {
    try {
      window.NHCPAnalytics?.track?.(eventName, {
        target_id: targetId,
        module: 'chapel-conservation',
        ...extra,
      });
    } catch (error) {
      console.warn('[conservation] Analytics event could not be recorded.', error);
    }
  }

  _createDefaultHeritageMissionState() {
    return {
      version: HERITAGE_MISSION_VERSION,
      started: false,
      language: 'tl',
      chapelEvidence: [],
      undergroundEvidence: [],
      timelineOrder: [],
      curatedChapel: '',
      curatedHistory: [],
      completed: false,
    };
  }

  _readHeritageMissionState() {
    const fallback = this._createDefaultHeritageMissionState();
    try {
      const stored = JSON.parse(window.localStorage.getItem(HERITAGE_MISSION_STORAGE_KEY) || 'null');
      if (!stored || stored.version !== HERITAGE_MISSION_VERSION) {
        return fallback;
      }
      return {
        ...fallback,
        ...stored,
        language: stored.language === 'en' ? 'en' : 'tl',
        chapelEvidence: Array.isArray(stored.chapelEvidence)
          ? stored.chapelEvidence.filter((id) => HERITAGE_MISSION_CHAPEL_IDS.includes(id))
          : [],
        undergroundEvidence: Array.isArray(stored.undergroundEvidence)
          ? stored.undergroundEvidence.filter((id) => HERITAGE_MISSION_TIMELINE.includes(id))
          : [],
        timelineOrder: Array.isArray(stored.timelineOrder)
          ? stored.timelineOrder.filter((id) => HERITAGE_MISSION_TIMELINE.includes(id))
          : [],
        curatedHistory: Array.isArray(stored.curatedHistory)
          ? stored.curatedHistory.filter((id) => HERITAGE_MISSION_TIMELINE.includes(id))
          : [],
      };
    } catch {
      return fallback;
    }
  }

  _saveHeritageMissionState() {
    try {
      window.localStorage.setItem(
        HERITAGE_MISSION_STORAGE_KEY,
        JSON.stringify(this.heritageMission),
      );
    } catch {
      // The experience remains usable when browser storage is unavailable.
    }
    this._renderHeritageMission();
    this._refreshHeritageMissionMarkers();
  }

  _missionText(tl, en) {
    return this.heritageMission.language === 'en' ? en : tl;
  }

  _missionTrack(eventType, targetId, extra = {}) {
    try {
      window.NHCPAnalytics?.track?.(
        eventType,
        'webxr',
        targetId,
        {
          language: this.heritageMission.language,
          scene: this._getHeritageMissionScene(),
          source: 'heritage-investigator',
          ...extra,
        },
      );
    } catch {
      // Analytics must never interrupt the experience.
    }
  }

  _getHeritageMissionScene() {
    if (this._isMuseumScene()) {
      return 'museum';
    }
    if (this._isUndergroundScene()) {
      return 'underground';
    }
    return 'chapel';
  }

  _setupHeritageMission() {
    const { missionButton, missionCloseButton, missionLanguageButton, missionContent } = this.refs;
    missionButton?.addEventListener('click', () => this._setHeritageMissionOpen(!this.heritageMissionOpen));
    missionCloseButton?.addEventListener('click', () => this._setHeritageMissionOpen(false));
    missionLanguageButton?.addEventListener('click', () => {
      this.heritageMission.language = this.heritageMission.language === 'tl' ? 'en' : 'tl';
      this.expandedHotspotLanguage = this.heritageMission.language;
      this._saveHeritageMissionState();
    });
    missionContent?.addEventListener('click', (event) => {
      const control = event.target.closest('[data-mission-action]');
      if (!control) {
        return;
      }
      event.preventDefault();
      this._handleHeritageMissionAction(
        control.dataset.missionAction,
        control.dataset.missionId || '',
      );
    });
    this.expandedHotspotLanguage = this.heritageMission.language;
    this._renderHeritageMission();
  }

  _maybeOpenHeritageMissionBriefing() {
    if (!this._isMuseumScene() || this.heritageMission.started) {
      return;
    }
    try {
      if (window.sessionStorage.getItem('nhcpHeritageMissionInviteShown') === '1') {
        return;
      }
      window.sessionStorage.setItem('nhcpHeritageMissionInviteShown', '1');
    } catch {
      // Still show the invitation when session storage is unavailable.
    }
    window.setTimeout(() => this._setHeritageMissionOpen(true), 550);
  }

  _setHeritageMissionOpen(open) {
    this.heritageMissionOpen = Boolean(open);
    this.refs.missionPanel?.classList.toggle('hidden', !this.heritageMissionOpen);
    this.refs.missionPanel?.setAttribute('aria-hidden', String(!this.heritageMissionOpen));
    this.refs.missionButton?.classList.toggle('is-active', this.heritageMissionOpen);
    this.refs.missionButton?.setAttribute('aria-expanded', String(this.heritageMissionOpen));
    if (this.heritageMissionOpen) {
      this._renderHeritageMission();
      this.refs.missionCloseButton?.focus({ preventScroll: true });
    }
  }

  _showHeritageMissionToast(tl, en, duration = 4200) {
    const toast = this.refs.missionToast;
    if (!toast) {
      return;
    }
    window.clearTimeout(this.heritageMissionToastTimer);
    toast.textContent = this._missionText(tl, en);
    toast.classList.remove('hidden');
    this.heritageMissionToastTimer = window.setTimeout(() => {
      toast.classList.add('hidden');
    }, duration);
  }

  _isChapelMissionComplete() {
    return HERITAGE_MISSION_CHAPEL_IDS.every((id) => this.heritageMission.chapelEvidence.includes(id));
  }

  _isUndergroundEvidenceComplete() {
    return HERITAGE_MISSION_TIMELINE.every((id) => this.heritageMission.undergroundEvidence.includes(id));
  }

  _isMissionTimelineComplete() {
    return HERITAGE_MISSION_TIMELINE.every((id, index) => this.heritageMission.timelineOrder[index] === id);
  }

  _getHeritageMissionStage() {
    if (this.heritageMission.completed) {
      return 5;
    }
    if (this._isMissionTimelineComplete()) {
      return 4;
    }
    if (this._isChapelMissionComplete()) {
      return 3;
    }
    return this.heritageMission.started ? 2 : 1;
  }

  _renderHeritageMissionProgress() {
    const progress = this.refs.missionProgress;
    if (!progress) {
      return;
    }
    const stage = this._getHeritageMissionStage();
    const labels = this.heritageMission.language === 'en'
      ? ['Briefing', 'Chapel', 'Underground', 'Exhibit']
      : ['Panimula', 'Kapilya', 'Ilalim ng Lupa', 'Eksibit'];
    progress.innerHTML = labels.map((label, index) => {
      const step = index + 1;
      const state = step < stage
        ? 'is-complete'
        : (step === stage ? 'is-current' : '');
      return `<span class="heritage-mission__step ${state}"><i>${step < stage ? '✓' : step}</i><b>${label}</b></span>`;
    }).join('');
  }

  _renderHeritageMission() {
    const { missionContent, missionLanguageButton, missionBadge, missionTitle } = this.refs;
    if (!missionContent) {
      return;
    }
    const language = this.heritageMission.language;
    if (missionLanguageButton) {
      missionLanguageButton.textContent = language === 'tl' ? 'TL' : 'EN';
      missionLanguageButton.setAttribute(
        'aria-label',
        language === 'tl' ? 'Switch mission language to English' : 'Palitan ang wika ng misyon sa Tagalog',
      );
    }
    if (missionTitle) {
      missionTitle.textContent = this._missionText('Talaang Pananaliksik', 'Field Notebook');
    }
    const collectedCount = this.heritageMission.chapelEvidence.length
      + this.heritageMission.undergroundEvidence.length;
    if (missionBadge) {
      missionBadge.textContent = String(collectedCount);
      missionBadge.hidden = !this.heritageMission.started;
      missionBadge.classList.toggle('is-complete', this.heritageMission.completed);
    }
    this._renderHeritageMissionProgress();

    if (!this.heritageMission.started) {
      missionContent.innerHTML = this._renderHeritageMissionBriefing();
      return;
    }
    const scene = this._getHeritageMissionScene();
    if (scene === 'chapel') {
      missionContent.innerHTML = this._renderChapelMission();
    } else if (scene === 'underground') {
      missionContent.innerHTML = this._renderUndergroundMission();
    } else {
      missionContent.innerHTML = this._renderMuseumMission();
    }
  }

  _renderHeritageMissionBriefing() {
    return `
      <section class="heritage-mission__section heritage-mission__section--intro">
        <span class="heritage-mission__chapter">01 · ${this._missionText('Panimula ng Tagapangasiwa', 'Curator Briefing')}</span>
        <h3>${this._missionText('Buuin ang kuwento mula sa ebidensiya', 'Build the story from evidence')}</h3>
        <p>${this._missionText(
          'May tatlong bahagi ang iyong pagsisiyasat: suriin ang mga materyales sa kapilya, tipunin ang mga tala sa ilalim ng lupa, at bumalik sa museo upang bumuo ng isang maliit na interpretibong eksibit.',
          'Your investigation has three parts: examine the chapel materials, gather historical records below ground, then return to the museum to curate a small interpretive exhibit.',
        )}</p>
        <div class="heritage-mission__role">
          <strong>${this._missionText('Ang iyong tungkulin', 'Your role')}</strong>
          <span>${this._missionText('Tagapagsiyasat ng Pamanang Kultural', 'Digital Heritage Investigator')}</span>
        </div>
        <p class="heritage-mission__note">${this._missionText(
          'Opsyonal ang gawaing ito. Maaari ka pa ring malayang maglibot anumang oras.',
          'This activity is optional. You can continue to explore freely at any time.',
        )}</p>
        <button class="heritage-mission__primary" type="button" data-mission-action="begin">${this._missionText('Simulan ang Pagsisiyasat', 'Begin Investigation')}</button>
      </section>`;
  }

  _renderMuseumMission() {
    if (this.heritageMission.completed) {
      return `
        <section class="heritage-mission__section heritage-mission__section--complete">
          <span class="heritage-mission__seal" aria-hidden="true">✓</span>
          <span class="heritage-mission__chapter">04 · ${this._missionText('Nabuo ang Eksibit', 'Exhibit Completed')}</span>
          <h3>${this._missionText('Mula sa bagay tungo sa buhay na alaala', 'From evidence to living memory')}</h3>
          <p>${this._missionText(
            'Pinag-ugnay mo ang mga materyales ng kapilya at ang mga tala ng kasaysayan upang makabuo ng isang interpretasyong may konteksto.',
            'You connected the chapel’s material evidence with its historical records to create an interpretation grounded in context.',
          )}</p>
          <button class="heritage-mission__secondary" type="button" data-mission-action="reset-confirm">${this._missionText('Ulitin ang Karanasan', 'Restart Experience')}</button>
        </section>`;
    }
    if (!this._isMissionTimelineComplete()) {
      const nextAction = this._isChapelMissionComplete() ? 'go-underground' : 'go-chapel';
      const nextLabel = this._isChapelMissionComplete()
        ? this._missionText('Magpatuloy sa Ilalim ng Lupa', 'Continue Underground')
        : this._missionText('Magpatuloy sa Kapilya', 'Continue to the Chapel');
      return `
        <section class="heritage-mission__section">
          <span class="heritage-mission__chapter">${this._missionText('Patuloy na Pagsisiyasat', 'Investigation in Progress')}</span>
          <h3>${this._missionText('Hindi pa kumpleto ang talaan', 'The field record is not complete yet')}</h3>
          <p>${this._missionText(
            'Buksan ang apat na talaan ng materyales sa kapilya, pagkatapos ay hanapin ang apat na gintong himpilan ng ebidensiya sa ilalim ng lupa.',
            'Open all four material tables in the chapel, then locate the four gold evidence stations underground.',
          )}</p>
          ${this._renderMissionCounts()}
          <button class="heritage-mission__primary" type="button" data-mission-action="${nextAction}">${nextLabel}</button>
        </section>`;
    }
    return this._renderMuseumCuration();
  }

  _renderMissionCounts() {
    return `
      <div class="heritage-mission__counts">
        <span><b>${this.heritageMission.chapelEvidence.length}/4</b>${this._missionText('Talaan ng kapilya', 'Chapel records')}</span>
        <span><b>${this.heritageMission.undergroundEvidence.length}/4</b>${this._missionText('Tala ng kasaysayan', 'History records')}</span>
      </div>`;
  }

  _renderChapelMission() {
    const cards = HERITAGE_MISSION_CHAPEL_IDS.map((id) => {
      const table = HOTSPOT_TABLES[id];
      const complete = this.heritageMission.chapelEvidence.includes(id);
      return `<li class="${complete ? 'is-collected' : ''}"><i>${complete ? '✓' : '○'}</i><span>${table.title[this.heritageMission.language] || table.title.en}</span></li>`;
    }).join('');
    const done = this._isChapelMissionComplete();
    return `
      <section class="heritage-mission__section">
        <span class="heritage-mission__chapter">02 · ${this._missionText('Pagsisiyasat sa Kapilya', 'Chapel Investigation')}</span>
        <h3>${this._missionText('Basahin ang gusali sa pamamagitan ng materyales', 'Read the building through its materials')}</h3>
        <p>${this._missionText(
          'Lumapit at buksan ang bawat glowing table hotspot. Suriin ang bato, kahoy, detalye, at mga pinaghalong ginamit sa kapilya.',
          'Approach and open each glowing table hotspot. Examine the stone, wood, details, and mixtures used in the chapel.',
        )}</p>
        <ul class="heritage-mission__checklist">${cards}</ul>
        <button class="heritage-mission__primary" type="button" data-mission-action="go-underground" ${done ? '' : 'disabled'}>${done
          ? this._missionText('Dalhin ang Talaan sa Ilalim ng Lupa', 'Take the Notebook Underground')
          : this._missionText('Suriin muna ang apat na talaan', 'Examine all four tables first')}</button>
      </section>`;
  }

  _renderUndergroundMission() {
    const cards = HERITAGE_MISSION_TIMELINE.map((id) => {
      const evidence = HERITAGE_MISSION_EVIDENCE[id];
      const complete = this.heritageMission.undergroundEvidence.includes(id);
      return `<li class="${complete ? 'is-collected' : ''}"><i>${complete ? '✓' : '○'}</i><span><b>${evidence.year}</b>${evidence.title[this.heritageMission.language] || evidence.title.en}${complete ? `<small>${evidence.text[this.heritageMission.language] || evidence.text.en}</small>` : ''}</span></li>`;
    }).join('');
    const evidenceComplete = this._isUndergroundEvidenceComplete();
    return `
      <section class="heritage-mission__section">
        <span class="heritage-mission__chapter">03 · ${this._missionText('Talaan sa Ilalim ng Lupa', 'Underground Evidence')}</span>
        <h3>${this._missionText('Hanapin ang mga bakas ng kasaysayan', 'Trace the historical record')}</h3>
        <p>${this._missionText(
          'Hanapin at buksan ang apat na gintong himpilan. Ang mga ito ay interpretibong tala, hindi muling pagtatanghal ng eksaktong lokasyon ng pangyayari.',
          'Find and open the four gold stations. They are interpretive evidence records, not reconstructions of the events’ exact locations.',
        )}</p>
        <ul class="heritage-mission__checklist heritage-mission__checklist--evidence">${cards}</ul>
        ${evidenceComplete ? this._renderTimelineTask() : `<p class="heritage-mission__note">${this._missionText('Lilitaw ang chronology task kapag kumpleto na ang apat na tala.', 'The chronology task unlocks after all four records are collected.')}</p>`}
      </section>`;
  }

  _renderTimelineTask() {
    if (this._isMissionTimelineComplete()) {
      return `
        <div class="heritage-mission__timeline-complete">
          <strong>✓ ${this._missionText('Tama ang pagkakasunod-sunod', 'Chronology restored')}</strong>
          <span>${this._missionText('1896 → 1897 → 1941–1945 → 1945', '1896 → 1897 → 1941–1945 → 1945')}</span>
        </div>
        <button class="heritage-mission__primary" type="button" data-mission-action="go-museum">${this._missionText('Bumalik sa Museo upang Mag-curate', 'Return to the Museum to Curate')}</button>`;
    }
    const scrambled = [
      'evidence-guerrillas',
      'evidence-revolution',
      'evidence-world-war-ii',
      'evidence-biak-na-bato',
    ];
    const selected = this.heritageMission.timelineOrder;
    const buttons = scrambled.map((id) => {
      const evidence = HERITAGE_MISSION_EVIDENCE[id];
      const selectedIndex = selected.indexOf(id);
      return `<button type="button" class="heritage-mission__timeline-card ${selectedIndex >= 0 ? 'is-selected' : ''}" data-mission-action="timeline" data-mission-id="${id}" ${selectedIndex >= 0 ? 'disabled' : ''}><b>${selectedIndex >= 0 ? selectedIndex + 1 : '?'}</b><span>${evidence.title[this.heritageMission.language] || evidence.title.en}</span><small>${evidence.year}</small></button>`;
    }).join('');
    return `
      <div class="heritage-mission__timeline-task">
        <h4>${this._missionText('Ayusin ang Tala ng Panahon', 'Restore the Chronology')}</h4>
        <p>${this._missionText('Piliin ang mga pangyayari mula sa pinakamaaga hanggang pinakahuli.', 'Select the events from earliest to latest.')}</p>
        <div class="heritage-mission__timeline-grid">${buttons}</div>
      </div>`;
  }

  _renderMuseumCuration() {
    const chapelOptions = HERITAGE_MISSION_CHAPEL_IDS.map((id) => {
      const table = HOTSPOT_TABLES[id];
      const selected = this.heritageMission.curatedChapel === id;
      return `<button type="button" class="heritage-mission__curation-card ${selected ? 'is-selected' : ''}" data-mission-action="curate-chapel" data-mission-id="${id}" aria-pressed="${selected}"><i>${selected ? '✓' : '+'}</i><span>${table.title[this.heritageMission.language] || table.title.en}</span></button>`;
    }).join('');
    const historyOptions = HERITAGE_MISSION_TIMELINE.map((id) => {
      const evidence = HERITAGE_MISSION_EVIDENCE[id];
      const selected = this.heritageMission.curatedHistory.includes(id);
      return `<button type="button" class="heritage-mission__curation-card ${selected ? 'is-selected' : ''}" data-mission-action="curate-history" data-mission-id="${id}" aria-pressed="${selected}"><i>${selected ? '✓' : '+'}</i><span><b>${evidence.year}</b>${evidence.title[this.heritageMission.language] || evidence.title.en}</span></button>`;
    }).join('');
    const ready = Boolean(this.heritageMission.curatedChapel)
      && this.heritageMission.curatedHistory.length === 2;
    return `
      <section class="heritage-mission__section">
        <span class="heritage-mission__chapter">04 · ${this._missionText('Munting Eksibit', 'Micro-Exhibit')}</span>
        <h3>${this._missionText('Piliin ang ebidensiyang mag-uugnay sa lugar at kasaysayan', 'Curate a connection between place and history')}</h3>
        <p>${this._missionText(
          'Pumili ng isang talaan ng materyales at dalawang tala ng kasaysayan. Ang mahusay na interpretasyon ay nag-uugnay ng pisikal na pamanang nakikita natin sa mga kuwentong pinangangalagaan nito.',
          'Choose one material record and two history records. Good interpretation connects the physical heritage we can observe with the stories it safeguards.',
        )}</p>
        <h4>${this._missionText('Isang talaan ng materyales', 'One material record')}</h4>
        <div class="heritage-mission__curation-grid">${chapelOptions}</div>
        <h4>${this._missionText('Dalawang tala ng kasaysayan', 'Two history records')}</h4>
        <div class="heritage-mission__curation-grid">${historyOptions}</div>
        <button class="heritage-mission__primary" type="button" data-mission-action="complete" ${ready ? '' : 'disabled'}>${ready
          ? this._missionText('Buuin ang Interpretibong Eksibit', 'Complete the Interpretive Exhibit')
          : this._missionText('Pumili ng 1 materyal at 2 tala', 'Choose 1 material and 2 records')}</button>
      </section>`;
  }

  _handleHeritageMissionAction(action, id) {
    if (action === 'begin') {
      this.heritageMission.started = true;
      this._saveHeritageMissionState();
      this._missionTrack('learning_activity_started', 'heritage-investigator');
      this._showHeritageMissionToast('Nagsimula na ang pagsisiyasat.', 'Investigation started.');
      return;
    }
    if (action === 'go-chapel') {
      window.location.assign('/3d-environment');
      return;
    }
    if (action === 'go-underground' && this._isChapelMissionComplete()) {
      window.location.assign('/3d-environment?zip=underground.zip');
      return;
    }
    if (action === 'go-museum' && this._isMissionTimelineComplete()) {
      window.location.assign('/3d-environment/museum');
      return;
    }
    if (action === 'timeline') {
      const expected = HERITAGE_MISSION_TIMELINE[this.heritageMission.timelineOrder.length];
      if (id !== expected) {
        this._showHeritageMissionToast(
          'Hindi pa iyan ang susunod. Ihambing ang mga taon sa bawat tala.',
          'That is not the next event. Compare the year on each record.',
        );
        return;
      }
      this.heritageMission.timelineOrder.push(id);
      this._saveHeritageMissionState();
      if (this._isMissionTimelineComplete()) {
        this._missionTrack('learning_activity_completed', 'heritage-chronology', { score: 4, total: 4 });
        this._showHeritageMissionToast('Nabuo ang tamang pagkakasunod-sunod.', 'The chronology is complete.');
      }
      return;
    }
    if (action === 'curate-chapel' && HERITAGE_MISSION_CHAPEL_IDS.includes(id)) {
      this.heritageMission.curatedChapel = id;
      this._saveHeritageMissionState();
      return;
    }
    if (action === 'curate-history' && HERITAGE_MISSION_TIMELINE.includes(id)) {
      const selected = this.heritageMission.curatedHistory;
      if (selected.includes(id)) {
        this.heritageMission.curatedHistory = selected.filter((item) => item !== id);
      } else if (selected.length < 2) {
        selected.push(id);
      } else {
        this._showHeritageMissionToast('Dalawang tala lamang ang piliin.', 'Choose only two history records.');
        return;
      }
      this._saveHeritageMissionState();
      return;
    }
    if (action === 'complete') {
      if (!this.heritageMission.curatedChapel || this.heritageMission.curatedHistory.length !== 2) {
        return;
      }
      this.heritageMission.completed = true;
      this._saveHeritageMissionState();
      this._missionTrack('learning_activity_completed', 'heritage-investigator', { score: 8, total: 8 });
      this._showHeritageMissionToast('Nabuo ang iyong interpretibong eksibit.', 'Your interpretive exhibit is complete.', 5200);
      return;
    }
    if (action === 'reset-confirm') {
      this.refs.missionContent.innerHTML = `
        <section class="heritage-mission__section heritage-mission__section--confirm">
          <h3>${this._missionText('Ulitin ang buong karanasan?', 'Restart the full experience?')}</h3>
          <p>${this._missionText('Mabubura ang kasalukuyang tala ng pagsisiyasat sa device na ito.', 'The current investigation record on this device will be cleared.')}</p>
          <div class="heritage-mission__confirm-actions">
            <button class="heritage-mission__secondary" type="button" data-mission-action="reset-cancel">${this._missionText('Kanselahin', 'Cancel')}</button>
            <button class="heritage-mission__danger" type="button" data-mission-action="reset">${this._missionText('Ulitin', 'Restart')}</button>
          </div>
        </section>`;
      return;
    }
    if (action === 'reset-cancel') {
      this._renderHeritageMission();
      return;
    }
    if (action === 'reset') {
      const language = this.heritageMission.language;
      this.heritageMission = this._createDefaultHeritageMissionState();
      this.heritageMission.language = language;
      this._saveHeritageMissionState();
      this._missionTrack('learning_activity_restarted', 'heritage-investigator');
    }
  }

  _collectHeritageMissionRecord(id) {
    if (!this.heritageMission.started) {
      return;
    }
    let target = null;
    let total = 0;
    if (HERITAGE_MISSION_CHAPEL_IDS.includes(id)) {
      target = this.heritageMission.chapelEvidence;
      total = 4;
    } else if (HERITAGE_MISSION_TIMELINE.includes(id)) {
      target = this.heritageMission.undergroundEvidence;
      total = 4;
    }
    if (!target || target.includes(id)) {
      return;
    }
    target.push(id);
    this._saveHeritageMissionState();
    this._missionTrack('evidence_collected', id, { score: target.length, total });
    this._showHeritageMissionToast(
      `Naitala ang ebidensiya (${target.length}/${total}).`,
      `Evidence recorded (${target.length}/${total}).`,
    );
  }

  _refreshHeritageMissionMarkers() {
    const collected = new Set([
      ...this.heritageMission.chapelEvidence,
      ...this.heritageMission.undergroundEvidence,
    ]);
    this.hotspotMarkers.forEach((marker) => {
      const isCollected = collected.has(marker.name);
      marker.userData.missionCollected = isCollected;
      marker.scale.setScalar(isCollected ? 0.84 : 1);
    });
    this.floatingHotspotLabels.forEach((label) => {
      label.element?.classList.toggle('is-collected', collected.has(label.hotspotId));
    });
  }

  async _toggleGyroLook() {
    if (!this.playerController) {
      return;
    }
    const next = !this.playerController.gyro.enabled;
    try {
      await this.playerController.setGyroEnabled(next);
      this.uiController.setGyroState(next);
      if (next) {
        this.uiController.showError('Gyro look on — move your phone to look around.', 2600);
      }
    } catch (error) {
      this.uiController.setGyroState(false);
      this.uiController.showError(String(error?.message ?? error), 4500);
    }
  }

  _handleBackRequested() {
    window.location.assign('/interactive');
  }

  async _toggleFullscreen() {
    const doc = document;
    const root = document.documentElement;
    const isActive = Boolean(doc.fullscreenElement);

    try {
      if (isActive) {
        await doc.exitFullscreen?.();
      } else {
        await root.requestFullscreen?.();
      }
    } catch (error) {
      console.warn('[ui] fullscreen toggle failed', error);
      this.uiController.setXrStatus('Fullscreen toggle failed on this device/browser.');
    } finally {
      this.uiController.setFullscreenState(Boolean(doc.fullscreenElement));
    }
  }

  _onFullscreenChange() {
    this.uiController.setFullscreenState(Boolean(document.fullscreenElement));
    this.playerController?.levelHorizon();
  }

  _setupExpandedHotspotOverlay() {
    if (this.expandedHotspotOverlay) {
      return;
    }

    const overlay = document.createElement('div');
    overlay.className = 'hotspot-image-overlay hidden';

    const panel = document.createElement('div');
    panel.className = 'hotspot-image-overlay-panel';

    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'hotspot-image-overlay-close';
    closeButton.textContent = 'x';
    closeButton.setAttribute('aria-label', 'Close hotspot image');

    const mediaFrame = document.createElement('div');
    mediaFrame.className = 'hotspot-image-overlay-media';

    const image = document.createElement('img');
    image.className = 'hotspot-image-overlay-image';
    image.alt = '';

    const hotspotLayer = document.createElement('div');
    hotspotLayer.className = 'hotspot-image-overlay-hotspots';
    hotspotLayer.setAttribute('aria-label', 'Table image hotspots');

    const detail = document.createElement('div');
    detail.className = 'hotspot-image-overlay-detail hidden';
    detail.setAttribute('role', 'dialog');
    detail.setAttribute('aria-label', 'Artifact detail');

    const detailImage = document.createElement('img');
    detailImage.className = 'hotspot-image-overlay-detail-image';
    detailImage.alt = '';

    const detailTitle = document.createElement('p');
    detailTitle.className = 'hotspot-image-overlay-detail-title';

    const detailBack = document.createElement('button');
    detailBack.type = 'button';
    detailBack.className = 'hotspot-image-overlay-detail-back';
    detailBack.textContent = '← Back to table';
    detailBack.setAttribute('aria-label', 'Return to the complete table');

    detail.append(detailImage, detailTitle, detailBack);
    mediaFrame.append(image, hotspotLayer, detail);

    const caption = document.createElement('p');
    caption.className = 'hotspot-image-overlay-caption';

    const description = document.createElement('p');
    description.className = 'hotspot-image-overlay-description hidden';

    const controls = document.createElement('div');
    controls.className = 'hotspot-image-overlay-controls';

    const toggleInfoButton = document.createElement('button');
    toggleInfoButton.type = 'button';
    toggleInfoButton.className = 'hotspot-image-overlay-toggle hidden';
    toggleInfoButton.textContent = 'Hide hotspots';
    toggleInfoButton.setAttribute('aria-pressed', 'true');

    const languageButton = document.createElement('button');
    languageButton.type = 'button';
    languageButton.className = 'hotspot-image-overlay-toggle hidden';
    languageButton.textContent = 'TL';
    languageButton.setAttribute('aria-label', 'Switch table narration to English');

    controls.append(toggleInfoButton, languageButton);
    panel.append(closeButton, mediaFrame, caption, description, controls);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    closeButton.addEventListener('click', (event) => {
      event.preventDefault();
      this._hideExpandedHotspotImage();
    });

    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) {
        this._hideExpandedHotspotImage();
      }
    });

    toggleInfoButton.addEventListener('click', (event) => {
      event.preventDefault();
      const shouldHide = !hotspotLayer.classList.contains('hidden');
      hotspotLayer.classList.toggle('hidden', shouldHide);
      toggleInfoButton.textContent = shouldHide ? 'Show hotspots' : 'Hide hotspots';
      toggleInfoButton.setAttribute('aria-pressed', String(!shouldHide));
    });

    languageButton.addEventListener('click', (event) => {
      event.preventDefault();
      this.expandedHotspotLanguage = this.expandedHotspotLanguage === 'tl' ? 'en' : 'tl';
      languageButton.textContent = this.expandedHotspotLanguage === 'tl' ? 'TL' : 'EN';
      languageButton.setAttribute(
        'aria-label',
        this.expandedHotspotLanguage === 'tl'
          ? 'Switch table narration to English'
          : 'Switch table narration to Tagalog',
      );
      if (this.expandedHotspotTable && this.expandedHotspotOverlayCaption) {
        this.expandedHotspotOverlayCaption.textContent =
          this.expandedHotspotTable.title?.[this.expandedHotspotLanguage]
          || this.expandedHotspotTable.title?.en
          || this.expandedHotspotTable.imageAlt;
      }
      this._renderExpandedHotspotDescription();
      if (this.expandedHotspotDetail) {
        this._playExpandedHotspotAudio(this.expandedHotspotDetail.audio);
      }
    });

    detailBack.addEventListener('click', (event) => {
      event.preventDefault();
      this._hideExpandedHotspotDetail();
    });

    this.expandedHotspotOverlay = overlay;
    this.expandedHotspotOverlayImage = image;
    this.expandedHotspotOverlayCaption = caption;
    this.expandedHotspotOverlayDescription = description;
    this.expandedHotspotOverlayToggle = toggleInfoButton;
    this.expandedHotspotOverlayLanguage = languageButton;
    this.expandedHotspotOverlayLayer = hotspotLayer;
    this.expandedHotspotOverlayDetail = detail;
    this.expandedHotspotOverlayDetailImage = detailImage;
    this.expandedHotspotOverlayDetailTitle = detailTitle;
  }

  _showExpandedHotspotImage(imageUrl, hotspotId) {
    const table = HOTSPOT_TABLES[hotspotId];
    if (!table || !imageUrl) {
      return;
    }
    // The four chapel tables use the same world-space viewer with mouse,
    // touch, or VR gaze. This keeps the image and its numbered detail pins in
    // the 3D environment instead of opening a flat browser overlay.
    if (CHURCH_HOTSPOT_TABLES[hotspotId] || this.renderer.xr.isPresenting) {
      this._showXrHotspotTable(hotspotId);
      return;
    }

    this._setupExpandedHotspotOverlay();
    if (!this.expandedHotspotOverlay || !this.expandedHotspotOverlayImage) {
      return;
    }

    this._stopExpandedHotspotAudio();
    this.expandedHotspotTable = table;
    this.expandedHotspotId = hotspotId;
    this.expandedHotspotDetail = null;
    this.expandedHotspotOverlayImage.src = table.imageUrl || imageUrl;
    this.expandedHotspotOverlayImage.alt = table.imageAlt || `${hotspotId} full image`;
    if (this.expandedHotspotOverlayCaption) {
      this.expandedHotspotOverlayCaption.textContent =
        table.title?.[this.expandedHotspotLanguage] || table.title?.en || table.imageAlt;
    }
    this._renderExpandedHotspotDescription();

    this._hideExpandedHotspotDetail();
    this._renderExpandedHotspotPins(table);

    const hasHotspots = Array.isArray(table.hotspots) && table.hotspots.length > 0;
    if (this.expandedHotspotOverlayToggle) {
      this.expandedHotspotOverlayToggle.classList.toggle('hidden', !hasHotspots);
      this.expandedHotspotOverlayToggle.textContent = 'Hide hotspots';
      this.expandedHotspotOverlayToggle.setAttribute('aria-pressed', 'true');
    }
    if (this.expandedHotspotOverlayLayer) {
      this.expandedHotspotOverlayLayer.classList.toggle('hidden', !hasHotspots);
    }
    if (this.expandedHotspotOverlayLanguage) {
      const hasBilingualAudio = (table.hotspots || []).some((hotspot) => (
        hotspot?.audio?.tl && hotspot.audio.en
      ));
      const hasBilingualEvidence = Boolean(
        HERITAGE_MISSION_EVIDENCE[hotspotId]?.text?.tl
        && HERITAGE_MISSION_EVIDENCE[hotspotId]?.text?.en,
      );
      this.expandedHotspotOverlayLanguage.classList.toggle(
        'hidden',
        !(hasBilingualAudio || hasBilingualEvidence),
      );
      this.expandedHotspotOverlayLanguage.textContent =
        this.expandedHotspotLanguage === 'tl' ? 'TL' : 'EN';
    }

    this.expandedHotspotOverlay.classList.remove('hidden');
  }

  _renderExpandedHotspotDescription() {
    const description = this.expandedHotspotOverlayDescription;
    if (!description) {
      return;
    }
    const evidence = HERITAGE_MISSION_EVIDENCE[this.expandedHotspotId] || null;
    const text = evidence?.text?.[this.expandedHotspotLanguage]
      || evidence?.text?.en
      || '';
    description.textContent = text;
    description.classList.toggle('hidden', !text);
  }

  _renderExpandedHotspotPins(table) {
    if (!this.expandedHotspotOverlayLayer) {
      return;
    }
    this.expandedHotspotOverlayLayer.replaceChildren();
    const hotspots = Array.isArray(table?.hotspots) ? table.hotspots : [];
    hotspots.forEach((hotspot, index) => {
      if (
        !hotspot?.imageUrl
        || !Number.isFinite(Number(hotspot.x))
        || !Number.isFinite(Number(hotspot.y))
      ) {
        return;
      }
      const pin = document.createElement('button');
      pin.type = 'button';
      pin.className = 'hotspot-image-overlay-pin';
      pin.style.left = `${Math.min(100, Math.max(0, Number(hotspot.x)))}%`;
      pin.style.top = `${Math.min(100, Math.max(0, Number(hotspot.y)))}%`;
      pin.textContent = String(index + 1);
      pin.setAttribute('aria-label', `Open ${hotspot.title || `table detail ${index + 1}`}`);
      pin.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        this._showExpandedHotspotDetail(hotspot);
      });
      this.expandedHotspotOverlayLayer.appendChild(pin);
    });
  }

  _showExpandedHotspotDetail(detail) {
    if (
      !detail?.imageUrl
      || !this.expandedHotspotOverlayDetail
      || !this.expandedHotspotOverlayDetailImage
    ) {
      return;
    }
    this.expandedHotspotDetail = detail;
    this._recordChapelConservationEvidence(this.expandedHotspotId, detail.id);
    this.expandedHotspotOverlayDetailImage.src = detail.imageUrl;
    this.expandedHotspotOverlayDetailImage.alt = detail.title || 'Artifact detail';
    if (this.expandedHotspotOverlayDetailTitle) {
      this.expandedHotspotOverlayDetailTitle.textContent = detail.title || 'Artifact detail';
    }
    this.expandedHotspotOverlayDetail.setAttribute(
      'aria-label',
      detail.title || 'Artifact detail',
    );
    this.expandedHotspotOverlayDetail.classList.remove('hidden');
    this._playExpandedHotspotAudio(detail.audio);
  }

  _hideExpandedHotspotDetail() {
    this._stopExpandedHotspotAudio();
    this.expandedHotspotDetail = null;
    this.expandedHotspotOverlayDetail?.classList.add('hidden');
    if (this.expandedHotspotOverlayDetailImage) {
      this.expandedHotspotOverlayDetailImage.removeAttribute('src');
      this.expandedHotspotOverlayDetailImage.alt = '';
    }
    if (this.expandedHotspotOverlayDetailTitle) {
      this.expandedHotspotOverlayDetailTitle.textContent = '';
    }
  }

  _playExpandedHotspotAudio(audioByLanguage) {
    this._stopExpandedHotspotAudio();
    const source = audioByLanguage
      ? (
          audioByLanguage[this.expandedHotspotLanguage]
          || audioByLanguage.en
          || audioByLanguage.tl
          || ''
        )
      : '';
    if (!source) {
      return;
    }
    const audio = new Audio(encodeURI(source));
    audio.preload = 'auto';
    this.expandedHotspotAudio = audio;
    const playing = audio.play();
    if (playing?.catch) {
      playing.catch((error) => {
        console.warn('[hotspot] Table detail audio could not autoplay.', error);
      });
    }
  }

  _stopExpandedHotspotAudio() {
    if (!this.expandedHotspotAudio) {
      return;
    }
    this.expandedHotspotAudio.pause();
    this.expandedHotspotAudio.currentTime = 0;
    this.expandedHotspotAudio = null;
  }

  _createXrTableControlTexture(label) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext('2d');
    if (!context) {
      return null;
    }
    context.scale(2, 2);
    context.clearRect(0, 0, 256, 256);
    context.beginPath();
    context.arc(128, 128, 104, 0, Math.PI * 2);
    context.fillStyle = 'rgba(13, 10, 4, 0.96)';
    context.fill();
    context.lineWidth = 10;
    context.strokeStyle = '#d4af6a';
    context.stroke();
    context.fillStyle = '#faf7f2';
    context.font = String(label).length > 2
      ? '700 54px Inter, sans-serif'
      : '800 86px Inter, sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(String(label), 128, 132);
    return this._configureSharpUiTexture(new THREE.CanvasTexture(canvas));
  }

  _createXrTableControl({
    parent,
    label,
    position,
    scale = 0.2,
    name,
    metadata = {},
  }) {
    const texture = this._createXrTableControlTexture(label);
    if (!parent || !texture) {
      return null;
    }
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    }));
    sprite.position.set(position[0], position[1], position[2] ?? 0.08);
    sprite.scale.setScalar(scale);
    sprite.renderOrder = 54;
    sprite.userData.isXrTablePickable = true;
    sprite.userData.interaction = {
      name,
      suppressPanel: true,
      metadata,
    };
    parent.add(sprite);
    this.pickableMeshes.push(sprite);
    return sprite;
  }

  _showXrHotspotTable(hotspotId) {
    const table = HOTSPOT_TABLES[hotspotId];
    if (!table || !this.scene || !this.camera) {
      return;
    }
    this._disposeXrHotspotTableViewer();
    this.xrHotspotTableId = hotspotId;
    this.xrHotspotTableDetail = null;
    this.xrHotspotTablePinsVisible = true;
    this.xrHotspotTableSourceMarker =
      this.hotspotMarkers.find((marker) => marker.name === hotspotId) || null;
    if (this.xrHotspotTableSourceMarker) {
      this.xrHotspotTableSourceMarker.visible = false;
    }
    this._rebuildXrHotspotTableViewer();
  }

  _rebuildXrHotspotTableViewer() {
    const table = HOTSPOT_TABLES[this.xrHotspotTableId];
    if (!table || !this.scene || !this.camera) {
      return;
    }

    const previousViewer = this.xrHotspotTableViewer;
    const previousPosition = previousViewer?.position?.clone() || null;
    const previousQuaternion = previousViewer?.quaternion?.clone() || null;
    this._disposeXrHotspotTableViewer({ restoreSource: false, stopAudio: false });

    const viewerRoot = new THREE.Group();
    viewerRoot.name = 'xr-hotspot-table-viewer';
    if (previousPosition && previousQuaternion) {
      viewerRoot.position.copy(previousPosition);
      viewerRoot.quaternion.copy(previousQuaternion);
    } else {
      const cameraPosition = new THREE.Vector3();
      const cameraDirection = new THREE.Vector3();
      this.camera.getWorldPosition(cameraPosition);
      this.camera.getWorldDirection(cameraDirection);
      cameraDirection.y = Math.max(-0.18, Math.min(0.18, cameraDirection.y));
      cameraDirection.normalize();
      viewerRoot.position.copy(cameraPosition).addScaledVector(cameraDirection, 1.75);
      viewerRoot.lookAt(cameraPosition);
    }

    this.xrHotspotTableViewer = viewerRoot;
    this.scene.add(viewerRoot);

    this._createXrTableControl({
      parent: viewerRoot,
      label: '×',
      position: [0.81, 0.58, 0.09],
      scale: 0.2,
      name: 'xr-table-close',
    });
    this._createXrTableControl({
      parent: viewerRoot,
      label: this.expandedHotspotLanguage === 'tl' ? 'TL' : 'EN',
      position: [-0.66, -0.56, 0.09],
      scale: 0.2,
      name: 'xr-table-language',
    });

    const detail = this.xrHotspotTableDetail;
    const imageUrl = detail?.imageUrl || table.imageUrl;
    const viewerAtBuild = viewerRoot;
    new THREE.TextureLoader().load(imageUrl, (texture) => {
      if (this.xrHotspotTableViewer !== viewerAtBuild) {
        texture.dispose();
        return;
      }
      texture.colorSpace = THREE.SRGBColorSpace;
      const sourceWidth = Number(texture.image?.naturalWidth ?? texture.image?.width ?? 1);
      const sourceHeight = Number(texture.image?.naturalHeight ?? texture.image?.height ?? 1);
      const aspect = sourceWidth / Math.max(1, sourceHeight);
      let width = 1.68;
      let height = width / aspect;
      if (height > 1.02) {
        height = 1.02;
        width = height * aspect;
      }
      const image = new THREE.Mesh(
        new THREE.PlaneGeometry(width, height),
        new THREE.MeshBasicMaterial({
          map: texture,
          transparent: true,
          depthTest: false,
          depthWrite: false,
          toneMapped: false,
        }),
      );
      image.position.set(0, 0.08, 0.06);
      image.renderOrder = 49;
      viewerRoot.add(image);

      if (detail) {
        this._createXrTableControl({
          parent: viewerRoot,
          label: '←',
          position: [-0.72, 0.52, 0.09],
          scale: 0.2,
          name: 'xr-table-back',
        });
        return;
      }

      if (!this.xrHotspotTablePinsVisible) {
        return;
      }
      (table.hotspots || []).forEach((hotspot, index) => {
        const x = (Math.min(100, Math.max(0, Number(hotspot.x))) / 100 - 0.5) * width;
        const y = (0.5 - Math.min(100, Math.max(0, Number(hotspot.y))) / 100) * height + 0.08;
        this._createXrTableControl({
          parent: viewerRoot,
          label: String(index + 1),
          position: [x, y, 0.09],
          scale: 0.13,
          name: 'xr-table-detail',
          metadata: {
            hotspotId: this.xrHotspotTableId,
            detailId: hotspot.id,
          },
        });
      });
    });

    if (!detail && Array.isArray(table.hotspots) && table.hotspots.length > 0) {
      this._createXrTableControl({
        parent: viewerRoot,
        label: 'PIN',
        position: [-0.34, -0.56, 0.09],
        scale: 0.2,
        name: 'xr-table-toggle',
      });
    }
  }

  _disposeXrHotspotTableViewer(options = {}) {
    const restoreSource = options.restoreSource !== false;
    const stopAudio = options.stopAudio !== false;
    const viewerRoot = this.xrHotspotTableViewer;
    if (viewerRoot) {
      const removedPickables = new Set();
      viewerRoot.traverse((object) => {
        if (object.userData?.isXrTablePickable) {
          removedPickables.add(object);
        }
        object.geometry?.dispose?.();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.filter(Boolean).forEach((material) => {
          material.map?.dispose?.();
          material.dispose?.();
        });
      });
      this.pickableMeshes = this.pickableMeshes.filter((mesh) => !removedPickables.has(mesh));
      viewerRoot.parent?.remove(viewerRoot);
    }
    this.xrHotspotTableViewer = null;
    if (restoreSource && this.xrHotspotTableSourceMarker) {
      this.xrHotspotTableSourceMarker.visible = true;
      this.xrHotspotTableSourceMarker = null;
      this.xrHotspotTableId = '';
      this.xrHotspotTableDetail = null;
    }
    if (stopAudio) {
      this._stopExpandedHotspotAudio();
    }
  }

  _hideExpandedHotspotImage() {
    this._hideExpandedHotspotDetail();
    this.expandedHotspotTable = null;
    this.expandedHotspotId = '';
    if (this.expandedHotspotOverlayDescription) {
      this.expandedHotspotOverlayDescription.textContent = '';
      this.expandedHotspotOverlayDescription.classList.add('hidden');
    }
    this.expandedHotspotOverlayLayer?.replaceChildren();
    this.expandedHotspotOverlay?.classList.add('hidden');
  }

  _setupLights() {
    const hemi = new THREE.HemisphereLight(0xffffff, 0x223344, 0.72);
    const key = new THREE.DirectionalLight(0xffffff, 0.45);
    key.position.set(5, 8, 5);
    this.scene.add(hemi, key);
  }

  _configureSharpUiTexture(texture) {
    if (!texture) {
      return texture;
    }

    const maxAnisotropy = this.renderer?.capabilities?.getMaxAnisotropy?.() ?? 1;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.anisotropy = Math.min(8, Math.max(1, maxAnisotropy));
    texture.needsUpdate = true;
    return texture;
  }

  _configureSharpModelMaterials(root) {
    if (!root?.traverse) {
      return;
    }

    const maxAnisotropy = this.renderer?.capabilities?.getMaxAnisotropy?.() ?? 1;
    const anisotropy = Math.min(8, Math.max(1, maxAnisotropy));
    const textureKeys = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'aoMap'];

    root.traverse((object) => {
      if (!object?.isMesh) {
        return;
      }
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material) => {
        if (!material) {
          return;
        }
        textureKeys.forEach((key) => {
          const texture = material[key];
          if (!texture) {
            return;
          }
          texture.anisotropy = anisotropy;
          if (key === 'map' || key === 'emissiveMap') {
            texture.colorSpace = THREE.SRGBColorSpace;
          }
          texture.needsUpdate = true;
        });
        material.needsUpdate = true;
      });
    });
  }

  _setupXrUi() {
    const mountXrButton = (button) => {
      const host = this.refs.xrButtonContainer ?? document.body;
      host.appendChild(button);
    };

    try {
      this.renderer.xr.setReferenceSpaceType('local-floor');
    } catch {
      this.renderer.xr.setReferenceSpaceType('local');
    }

    // Keep the framebuffer conservative enough for phone VR, but give GLBs,
    // canvas controls, text, and the gaze reticle more pixels. Spark's splat
    // count and LOD budget remain unchanged.
    try {
      this.renderer.xr.setFramebufferScaleFactor(this.mobileMode ? 0.52 : 0.9);
    } catch (error) {
      console.warn('[xr] framebuffer scale could not be configured', error);
    }

    const xrApiAvailable = Boolean(navigator.xr);

    Promise.resolve(
      xrApiAvailable
        ? navigator.xr.isSessionSupported(XR_SESSION_MODE_VR).catch(() => false)
        : false,
    )
      .then((vrSupported) => {
        const formatVrStartError = (error) => {
          const name = String(error?.name || 'Error');
          const message = String(error?.message || '').trim();
          const detail = message ? `${name}: ${message}` : name;

          if (name === 'NotAllowedError') {
            return `Full 3D XR blocked (${detail}). Allow XR permissions for this site.`;
          }

          if (name === 'SecurityError') {
            return `Full 3D XR blocked (${detail}). Open this page over HTTPS.`;
          }

          if (name === 'NotSupportedError') {
            return `Full 3D XR unsupported (${detail}). Tip: on phones without VR support (like iPhone), use the Gyro button to look around by moving your phone.`;
          }

          return `Full 3D XR start failed (${detail}).`;
        };

        const showUnsupportedModeMessage = () => {
          if (IS_IOS_DEVICE) {
            this.uiController.showError(
              'VR mode is not supported on iPhone. You can continue in the normal 3D view or use the Gyro button to look around.',
              6500,
            );
            return;
          }

          this.uiController.showError('VR headset mode is not available on this device/browser. Tip: tap the Gyro button to look around by moving your phone.', 4500);
        };

        const requestVrSessionWithFallback = async () => {
          const sessionAttempts = [
            {
              optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking'],
            },
            {
              optionalFeatures: ['local-floor', 'bounded-floor'],
            },
            {},
          ];

          let lastError = null;

          for (const options of sessionAttempts) {
            try {
              return await navigator.xr.requestSession(XR_SESSION_MODE_VR, options);
            } catch (error) {
              lastError = error;
              console.warn('[xr] VR requestSession attempt failed', { options, error });
            }
          }

          throw lastError || new Error('VR session request failed.');
        };

        const getReferenceSpaceCandidates = () => ['local-floor', 'local'];

        const bindSessionWithReferenceSpaceFallback = async (session, sessionMode) => {
          const candidates = getReferenceSpaceCandidates(sessionMode);
          let lastError = null;

          for (const referenceSpaceType of candidates) {
            try {
              this.renderer.xr.setReferenceSpaceType(referenceSpaceType);
            } catch (error) {
              lastError = error;
              continue;
            }

            try {
              await this.renderer.xr.setSession(session);
              return referenceSpaceType;
            } catch (error) {
              lastError = error;
              console.warn('[xr] setSession failed for reference space', {
                sessionMode,
                referenceSpaceType,
                error,
              });
            }
          }

          throw lastError || new Error('Failed to bind XR session.');
        };
          let activeSession = null;
          let activeButton = null;
          const xrButtons = [];

          const setButtonsDisabled = (disabled) => {
            for (const entry of xrButtons) {
              entry.button.disabled = disabled;
            }
          };

          const resetButtons = () => {
            for (const entry of xrButtons) {
              entry.button.disabled = false;
              if (entry.buttonLabel) {
                entry.buttonLabel.textContent = entry.startLabel;
              }
            }
          };

          const onSessionEnded = () => {
            if (activeSession) {
              activeSession.removeEventListener('end', onSessionEnded);
            }
            activeSession = null;
            activeButton = null;
            this.activeXrReferenceSpaceType = null;
            this.activeXrSessionMode = null;
            resetButtons();
          };

          const createSessionButton = ({
            iconLabel,
            startLabel,
            startingLabel,
            stopLabel,
            sessionMode,
            supported,
            requestSession,
            formatStartError,
          }) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'tour-control-dock__action';
            button.innerHTML = `
              <span class="tour-control-dock__icon" aria-hidden="true">${iconLabel}</span>
              <span class="tour-control-dock__label">${startLabel}</span>
            `;
            const buttonLabel = button.querySelector('.tour-control-dock__label');
            xrButtons.push({ button, startLabel, buttonLabel });

            button.addEventListener('click', async () => {
              this.uiController.clearError();

              if (activeSession) {
                if (activeButton === button) {
                  button.disabled = true;
                  try {
                    await activeSession.end();
                  } catch {
                    this.uiController.setXrStatus('Could not end active XR session. Try again.');
                    resetButtons();
                  }
                } else {
                  this.uiController.setXrStatus('Another XR mode is active. Stop it first, then start this mode.');
                }
                return;
              }

              if (!supported) {
                showUnsupportedModeMessage(sessionMode);
                return;
              }

              setButtonsDisabled(true);
              if (buttonLabel) {
                buttonLabel.textContent = startingLabel;
              }
              let pendingSession = null;

              try {
                const session = await requestSession();
                pendingSession = session;
                // XRSession keeps its requested mode internally, but the mode
                // is not a public WebXR attribute. Retain the known mode here
                // for rendering, movement, and interaction decisions.
                this.activeXrSessionMode = sessionMode;
                session.addEventListener('end', onSessionEnded);

                const boundReferenceSpaceType = await bindSessionWithReferenceSpaceFallback(
                  session,
                  sessionMode,
                );

                activeSession = session;
                activeButton = button;
                this.activeXrReferenceSpaceType = boundReferenceSpaceType;
                pendingSession = null;

                if (sessionMode === XR_SESSION_MODE_VR) {
                  try {
                    // Keep only a light compositor optimization. Splat detail
                    // itself returns to the normal scene budget after startup.
                    this.renderer.xr.setFoveation(this.mobileMode ? 0.2 : 0.1);
                  } catch (error) {
                    console.warn('[xr] foveation could not be configured', error);
                  }
                }

                setButtonsDisabled(true);
                button.disabled = false;
                if (buttonLabel) {
                  buttonLabel.textContent = stopLabel;
                }
              } catch (error) {
                if (pendingSession) {
                  try {
                    pendingSession.removeEventListener('end', onSessionEnded);
                    await pendingSession.end();
                  } catch {
                  }
                }

                console.warn('[xr] failed to start XR session', { sessionMode, error });
                this.activeXrReferenceSpaceType = null;
                this.activeXrSessionMode = null;
                resetButtons();
                this.uiController.setXrStatus(formatStartError(error));
              }
            });

            mountXrButton(button);
          };

          createSessionButton({
            iconLabel: 'VR',
            startLabel: 'VR',
            startingLabel: '...',
            stopLabel: 'Stop',
            sessionMode: XR_SESSION_MODE_VR,
            supported: vrSupported,
            requestSession: requestVrSessionWithFallback,
            formatStartError: formatVrStartError,
          });

      })
      .catch(() => {
        const fallbackButtons = [
          {
            iconLabel: 'VR',
            startLabel: 'VR',
            sessionMode: XR_SESSION_MODE_VR,
          },
        ];

        for (const entry of fallbackButtons) {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'tour-control-dock__action';
          button.innerHTML = `
            <span class="tour-control-dock__icon" aria-hidden="true">${entry.iconLabel}</span>
            <span class="tour-control-dock__label">${entry.startLabel}</span>
          `;
          button.addEventListener('click', () => {
            this.uiController.showError('WebXR capability check failed on this device/browser, so this XR mode cannot start.', 3200);
          });
          mountXrButton(button);
        }
      });

    this.renderer.xr.addEventListener('sessionstart', () => {
      const mode = this.activeXrSessionMode;
      this.uiController.clearError();

      this.uiController.setMobileControlsVisible(true);
      if (mode === XR_SESSION_MODE_VR) {
        // Three.js replaces the base camera orientation with the headset pose
        // in immersive mode. Move the authored/current horizontal heading to
        // the persistent player rig first so Church's spawn direction is not
        // discarded when the native XR camera takes over.
        this.playerRig.rotation.y += this.camera.rotation.y;
        this.camera.rotation.y = 0;
        this.playerRig.updateMatrixWorld(true);
      }
      this.playerController?.levelHorizon();
      this.gazeTeleportSystem?.reset();

      this.xrFrameSubmitted = false;
      this.xrRenderFailure = null;
      this.xrLoadingPanelStartedAt = performance.now();
      this._setXrLoadingPanel('Preparing the 3D Environment\u2026', true);

      // Submit a lightweight Three.js frame before any SPZ draw calls. Native
      // phone VR compositors can otherwise enter immersive mode while a large
      // first stereo splat frame is still compiling/allocating, which appears
      // as an indefinitely black Google VR screen.
      if (mode === XR_SESSION_MODE_VR) {
        this.xrSplatRevealIndex = 0;
        this.xrSplatRevealStartedAt = this.xrLoadingPanelStartedAt + 700;
        this.xrSplatsFullyRevealedAt = 0;
        for (const entry of this.splatEntries) {
          if (entry?.object) {
            entry.object.visible = false;
          }
        }
      } else {
        this.xrSplatRevealIndex = this.splatEntries.length;
        this.xrSplatRevealStartedAt = 0;
        this.xrSplatsFullyRevealedAt = this.xrLoadingPanelStartedAt;
      }

      if (mode === XR_SESSION_MODE_VR && this.sparkRenderer) {
        this.xrPreviousSparkBudget = {
          lodSplatCount: this.sparkRenderer.lodSplatCount,
          lodSplatScale: this.sparkRenderer.lodSplatScale,
          lodRenderScale: this.sparkRenderer.lodRenderScale,
        };
        this.xrPreviousSparkVisibility = this.sparkRenderer.visible;
        this.sparkRenderer.visible = false;
        if (typeof this.sparkRenderer.clearSplats === 'function') {
          this.sparkRenderer.clearSplats();
        }

        // Start conservatively to guarantee that the native compositor gets
        // valid frames. Once all SPZ files are visible, quality rises in two
        // stages back to the exact budget used by the normal 3D scene.
        this._applyXrStartupQuality();
      }
    });
    this.renderer.xr.addEventListener('sessionend', () => {
      this.activeXrReferenceSpaceType = null;
      this.activeXrSessionMode = null;

      this.playerController?.restoreAfterXrSession();
      this.gazeTeleportSystem?.reset();
      this.uiController.setMobileControlsVisible(true);
      this._setXrLoadingPanel('', false);
      this.xrFrameSubmitted = false;
      this.xrRenderFailure = null;

      for (const entry of this.splatEntries) {
        if (entry?.object) {
          entry.object.visible = true;
        }
      }
      this.xrSplatRevealIndex = 0;
      this.xrSplatRevealStartedAt = 0;
      this.xrSplatsFullyRevealedAt = 0;

      if (this.sparkRenderer && this.xrPreviousSparkBudget) {
        this.sparkRenderer.lodSplatCount = this.xrPreviousSparkBudget.lodSplatCount;
        this.sparkRenderer.lodSplatScale = this.xrPreviousSparkBudget.lodSplatScale;
        this.sparkRenderer.lodRenderScale = this.xrPreviousSparkBudget.lodRenderScale;
      }
      if (this.sparkRenderer && this.xrPreviousSparkVisibility !== null) {
        this.sparkRenderer.visible = this.xrPreviousSparkVisibility;
      }
      this.xrPreviousSparkBudget = null;
      this.xrPreviousSparkVisibility = null;
      this.xrTargetSparkBudget = null;
      this.xrQualityStage = 0;
    });
  }

  _createXrLoadingPanel() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 320;
    const context = canvas.getContext('2d');
    if (!context) {
      return null;
    }

    const texture = this._configureSharpUiTexture(new THREE.CanvasTexture(canvas));

    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    }));
    sprite.name = 'xr-loading-panel';
    sprite.visible = false;
    sprite.renderOrder = 20000;
    sprite.frustumCulled = false;
    sprite.userData.canvas = canvas;
    sprite.userData.context = context;
    sprite.scale.set(1.55, 0.485, 1);
    this.scene.add(sprite);
    return sprite;
  }

  _setXrLoadingPanel(message, visible) {
    if (!this.xrLoadingPanel) {
      this.xrLoadingPanel = this._createXrLoadingPanel();
    }
    const panel = this.xrLoadingPanel;
    if (!panel) {
      return;
    }

    panel.visible = Boolean(visible);
    if (!visible) {
      return;
    }

    const context = panel.userData.context;
    const canvas = panel.userData.canvas;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = 'rgba(17, 12, 6, 0.94)';
    context.beginPath();
    if (typeof context.roundRect === 'function') {
      context.roundRect(8, 8, canvas.width - 16, canvas.height - 16, 42);
    } else {
      // Older Android WebViews used by some Google VR shells do not expose
      // CanvasRenderingContext2D.roundRect(). A plain rectangle keeps the XR
      // sessionstart handler from failing before the first immersive frame.
      context.rect(8, 8, canvas.width - 16, canvas.height - 16);
    }
    context.fill();
    context.lineWidth = 9;
    context.strokeStyle = '#d4af6a';
    context.stroke();
    context.fillStyle = '#f7ead0';
    context.textAlign = 'center';
    context.font = "600 48px 'Inter', sans-serif";
    context.fillText('Museo ng Libingan sa Ilalim ng Lupa ng Nagcarlan', canvas.width / 2, 126);
    context.fillStyle = '#d4af6a';
    context.font = "500 38px 'Inter', sans-serif";
    context.fillText(String(message || 'Preparing the 3D Environment\u2026'), canvas.width / 2, 210);
    panel.material.map.needsUpdate = true;
  }

  _updateXrLoadingPanel() {
    const panel = this.xrLoadingPanel;
    if (!panel?.visible || !this.renderer.xr.isPresenting) {
      return;
    }

    const xrCamera = this.renderer.xr.getCamera(this.camera);
    const eyeCameras = Array.isArray(xrCamera?.cameras) ? xrCamera.cameras : [];
    const viewCamera = eyeCameras[0] || xrCamera || this.camera;
    viewCamera.updateWorldMatrix(true, false);

    const origin = new THREE.Vector3();
    const direction = new THREE.Vector3();
    viewCamera.getWorldPosition(origin);
    viewCamera.getWorldDirection(direction).normalize();
    panel.position.copy(origin).addScaledVector(direction, 1.45);

    // Asset downloads and GPU initialization continue asynchronously while
    // the XR animation loop keeps submitting frames. Never auto-hide this
    // panel until the scene swap has finished configuring the new systems.
    if (this.sceneTransitionInProgress) {
      return;
    }

    const now = performance.now();
    const elapsed = now - this.xrLoadingPanelStartedAt;
    const environmentSettled = this.splatEntries.length === 0
      ? elapsed >= 900
      : this.xrSplatsFullyRevealedAt > 0 && now - this.xrSplatsFullyRevealedAt >= 1100;
    if (this.xrFrameSubmitted && environmentSettled && !this.xrRenderFailure) {
      panel.visible = false;
    }
  }

  _updateXrHotspotTableViewer() {
    const viewerRoot = this.xrHotspotTableViewer;
    if (!viewerRoot || !this.camera) {
      return;
    }

    this.camera.getWorldPosition(this.xrHotspotTableBillboardTarget);
    this.xrHotspotTableBillboardTarget.y = viewerRoot.position.y;
    viewerRoot.lookAt(this.xrHotspotTableBillboardTarget);
  }

  _updateXrSplatWarmup() {
    if (
      !this.renderer.xr.isPresenting
      || this.activeXrSessionMode !== XR_SESSION_MODE_VR
      || this.splatEntries.length === 0
      || this.xrSplatsFullyRevealedAt
    ) {
      return;
    }

    const now = performance.now();
    if (!this.xrFrameSubmitted || now < this.xrSplatRevealStartedAt) {
      return;
    }

    if (this.sparkRenderer && this.sparkRenderer.visible === false) {
      this.sparkRenderer.visible = this.xrPreviousSparkVisibility !== false;
    }

    // Reveal one SPZ per submitted frame (and no faster than 240 ms) so scene
    // shader compilation and GPU uploads are spread across several frames.
    const expectedIndex = Math.min(
      this.splatEntries.length,
      1 + Math.floor((now - this.xrSplatRevealStartedAt) / 240),
    );
    while (this.xrSplatRevealIndex < expectedIndex) {
      const entry = this.splatEntries[this.xrSplatRevealIndex];
      if (entry?.object) {
        entry.object.visible = true;
      }
      this.xrSplatRevealIndex += 1;
    }

    if (this.xrSplatRevealIndex >= this.splatEntries.length) {
      this.xrSplatsFullyRevealedAt = now;
    }
  }

  _applyXrStartupQuality() {
    if (!this.sparkRenderer || this.activeXrSessionMode !== XR_SESSION_MODE_VR) {
      return;
    }

    // The values captured on session start are Spark's normal-mode settings.
    // Preserve them verbatim instead of replacing them with a mobile-specific
    // splat ceiling, so VR reaches the same source quality after warm-up.
    const normalBudget = this.xrPreviousSparkBudget ?? {
      lodSplatCount: this.sparkRenderer.lodSplatCount,
      lodSplatScale: this.sparkRenderer.lodSplatScale,
      lodRenderScale: this.sparkRenderer.lodRenderScale,
    };
    this.xrTargetSparkBudget = { ...normalBudget };
    this.xrQualityStage = 0;
    this.sparkRenderer.lodSplatCount = this.mobileMode ? 220000 : 420000;
    this.sparkRenderer.lodSplatScale = 1;
    this.sparkRenderer.lodRenderScale = this.mobileMode ? 2.3 : 1.45;
  }

  _updateXrAdaptiveQuality() {
    if (
      !this.renderer.xr.isPresenting
      || this.activeXrSessionMode !== XR_SESSION_MODE_VR
      || !this.sparkRenderer
      || !this.xrTargetSparkBudget
      || !this.xrSplatsFullyRevealedAt
    ) {
      return;
    }

    const elapsed = performance.now() - this.xrSplatsFullyRevealedAt;
    const nextStage = elapsed >= 2600 ? 2 : elapsed >= 900 ? 1 : 0;
    if (nextStage <= this.xrQualityStage) {
      return;
    }

    const target = this.xrTargetSparkBudget;
    if (nextStage === 1) {
      // First increase reduces visible softness without suddenly applying the
      // full normal-scene workload on the frame that closes the loading panel.
      const targetCount = Number(target.lodSplatCount);
      const targetScale = Number(target.lodSplatScale);
      const targetRenderScale = Number(target.lodRenderScale);
      if (Number.isFinite(targetCount)) {
        this.sparkRenderer.lodSplatCount = Math.round(
          (this.sparkRenderer.lodSplatCount + targetCount) * 0.5,
        );
      }
      if (Number.isFinite(targetScale)) {
        this.sparkRenderer.lodSplatScale = (1 + targetScale) * 0.5;
      }
      if (Number.isFinite(targetRenderScale)) {
        this.sparkRenderer.lodRenderScale = (
          this.sparkRenderer.lodRenderScale + targetRenderScale
        ) * 0.5;
      }
    } else {
      this.sparkRenderer.lodSplatCount = target.lodSplatCount;
      this.sparkRenderer.lodSplatScale = target.lodSplatScale;
      this.sparkRenderer.lodRenderScale = target.lodRenderScale;
    }
    this.xrQualityStage = nextStage;
  }

  _registerInteractions() {
    this.interactionRegistry.register('door', () => {
      this._transferToUnderground();
    });

    this.interactionRegistry.register('go-to-museum', () => {
      this._transferToMuseum();
    });

    this.interactionRegistry.register('go-to-church', () => {
      this._transferToChurch();
    });

    this.interactionRegistry.register('go-back-to-church', () => {
      this._transferToChurch();
    });

    this.interactionRegistry.register('museum-artifact-toggle', () => {
      this._setMuseumArtifactStationOpen(!this.museumArtifactStation.isOpen);
    });

    this.interactionRegistry.register('museum-artifact-prev', () => {
      this._stepMuseumArtifact(-1);
    });

    this.interactionRegistry.register('museum-artifact-next', () => {
      this._stepMuseumArtifact(1);
    });

    this.interactionRegistry.register('museum-artifact-language', () => {
      this._toggleMuseumArtifactLanguage();
    });

    this.interactionRegistry.register('museum-artifact-subtitles', () => {
      this._toggleMuseumArtifactSubtitles();
    });

    Object.keys(MUSEUM_CONTENT_HOTSPOTS).forEach((hotspotId) => {
      this.interactionRegistry.register(hotspotId, () => {
        if (
          this.museumContentViewer.isOpen
          && this.museumContentViewer.hotspotId === hotspotId
        ) {
          this._disposeMuseumContentViewer();
          return;
        }
        this._openMuseumContentViewer(hotspotId);
      });
    });

    this.interactionRegistry.register('museum-content-prev', () => {
      this._stepMuseumContent(-1);
    });

    this.interactionRegistry.register('museum-content-next', () => {
      this._stepMuseumContent(1);
    });

    this.interactionRegistry.register('museum-content-language', () => {
      this._toggleMuseumContentLanguage();
    });

    this.interactionRegistry.register('museum-content-subtitles', () => {
      this._toggleMuseumContentSubtitles();
    });

    this.interactionRegistry.register('altar', (context) => {
      console.log('[interaction] altar selected', context);
    });

    // The same table hotspots used by mouse/touch must open their spatial
    // viewer when activated by a controller or the phone-VR dwell reticle.
    // Registering them here keeps every input path on one action handler.
    Object.entries(HOTSPOT_TABLES).forEach(([hotspotId, table]) => {
      this.interactionRegistry.register(hotspotId, () => {
        this._showExpandedHotspotImage(table.imageUrl, hotspotId);
      });
    });

    this.interactionRegistry.register('xr-table-close', () => {
      this._disposeXrHotspotTableViewer();
    });
    this.interactionRegistry.register('xr-table-language', () => {
      this.expandedHotspotLanguage = this.expandedHotspotLanguage === 'tl' ? 'en' : 'tl';
      this.chapelConservation.language = this.expandedHotspotLanguage;
      this._saveChapelConservationState();
      if (this.xrHotspotTableDetail) {
        this._playExpandedHotspotAudio(this.xrHotspotTableDetail.audio);
      }
      this._rebuildXrHotspotTableViewer();
      this._renderChapelConservation();
    });
    this.interactionRegistry.register('xr-table-back', () => {
      this._stopExpandedHotspotAudio();
      this.xrHotspotTableDetail = null;
      this._rebuildXrHotspotTableViewer();
    });
    this.interactionRegistry.register('xr-table-toggle', () => {
      this.xrHotspotTablePinsVisible = !this.xrHotspotTablePinsVisible;
      this._rebuildXrHotspotTableViewer();
    });
    this.interactionRegistry.register('xr-table-detail', (context) => {
      const stationId = String(context?.metadata?.hotspotId || this.xrHotspotTableId || '');
      const detailId = String(context?.metadata?.detailId || '');
      const table = HOTSPOT_TABLES[stationId];
      const detail = table?.hotspots?.find((item) => item.id === detailId) || null;
      if (!detail) {
        return;
      }
      this.xrHotspotTableDetail = detail;
      this._recordChapelConservationEvidence(stationId, detailId);
      this._playExpandedHotspotAudio(detail.audio);
      this._rebuildXrHotspotTableViewer();
    });
  }

  async _fetchMetadata() {
    const prefetched = this._readPrefetchedMetadata();
    if (prefetched) {
      return prefetched;
    }

    let query = '';
    if (this.requestedScene) {
      query = `?scene=${encodeURIComponent(this.requestedScene)}`;
    } else if (this.requestedZipOverride) {
      query = `?zip=${encodeURIComponent(this.requestedZipOverride)}`;
    }
    const response = await fetch(`/api/webxr/scene${query}`, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Could not load /api/webxr/scene (${response.status})`);
    }
    const payload = await response.json();
    this._storePrefetchedMetadata(payload);
    return payload;
  }

  async _fetchSceneMetadata({ scene = null, zip = null } = {}) {
    let query = '';
    if (scene) {
      query = `?scene=${encodeURIComponent(scene)}`;
    } else if (zip) {
      query = `?zip=${encodeURIComponent(zip)}`;
    }

    const response = await fetch(`/api/webxr/scene${query}`, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Could not load the requested 3D scene (${response.status}).`);
    }
    return response.json();
  }

  _readPrefetchedMetadata() {
    if (this.requestedScene || this.requestedZipOverride) {
      return null;
    }

    if (!window.sessionStorage) {
      return null;
    }

    let raw = null;
    try {
      raw = window.sessionStorage.getItem(WEBXR_PREFETCH_STORAGE_KEY);
    } catch {
      return null;
    }

    if (!raw) {
      return null;
    }

    try {
      const payload = JSON.parse(raw);
      if (!payload || payload.version !== 1 || !payload.metadata || !payload.metadata.scene) {
        return null;
      }

      const expectedZip = String(this.requestedZipOverride || '').trim();
      const cachedZip = String(payload.zipOverride || '').trim();
      if (cachedZip !== expectedZip) {
        return null;
      }

      const now = Date.now();
      const expiresAt = Number(payload.expiresAt || 0);
      if (Number.isFinite(expiresAt) && expiresAt > now) {
        return payload.metadata;
      }

      const storedAt = Number(payload.storedAt || 0);
      if (Number.isFinite(storedAt) && now - storedAt <= WEBXR_PREFETCH_MAX_AGE_MS) {
        return payload.metadata;
      }
    } catch {
      try {
        window.sessionStorage.removeItem(WEBXR_PREFETCH_STORAGE_KEY);
      } catch {
      }
      return null;
    }

    return null;
  }

  _storePrefetchedMetadata(payload) {
    if (this.requestedScene || this.requestedZipOverride) {
      return;
    }

    if (!window.sessionStorage || !payload || !payload.scene) {
      return;
    }

    const now = Date.now();
    const toStore = {
      version: 1,
      zipOverride: String(this.requestedZipOverride || '').trim(),
      storedAt: now,
      expiresAt: now + WEBXR_PREFETCH_MAX_AGE_MS,
      metadata: payload,
    };

    try {
      window.sessionStorage.setItem(WEBXR_PREFETCH_STORAGE_KEY, JSON.stringify(toStore));
    } catch {
    }
  }

  async _loadSparkRuntime() {
    const sparkUrl = this.metadata.scene?.source?.sparkModuleUrl;
    if (!sparkUrl) {
      console.warn('[spark] no module URL in metadata; splats may fail to load');
      return;
    }

    this.uiController.setLoadingProgress(0.1, 'Loading Spark runtime...');

    try {
      const spark = await import(sparkUrl);
      this.SplatMeshCtor = spark.SplatMesh;

      if (spark.SparkRenderer) {
        this.sparkRenderer = new spark.SparkRenderer({
          renderer: this.renderer,
          maxStdDev: Math.sqrt(5),
          // Maintain a compact LoD sample specifically for camera-to-hotspot
          // visibility tests instead of scanning every source splat per ray.
          lodRaycast: 20000,
          lodRaycastIntervalMs: 180,
          // Spark recommends completing its update after the current render
          // in WebXR so the stereo frame can be submitted promptly.
          preUpdate: false,
        });
        this.sparkRenderer.name = 'spark-renderer';
        this.scene.add(this.sparkRenderer);
      }
    } catch (error) {
      console.warn('[spark] failed to load Spark module', error);
      this.uiController.showError(
        'Spark module failed to load. GLB meshes will still render, but splats may be missing.',
      );
    }
  }

  async _loadSceneAssets() {
    const splatAssets = this.metadata.scene?.assets?.splats ?? [];
    const meshAssets = this.metadata.scene?.assets?.meshes ?? [];

    const total = splatAssets.length + meshAssets.length;
    const requireEverySplat = this._isMuseumScene();
    const splatsBeforeLoad = this.splatEntries.length;
    let done = 0;

    const updateProgress = (label) => {
      const ratio = total > 0 ? done / total : 1;
      const from = 0.15;
      const to = 0.92;
      this.uiController.setLoadingProgress(from + (to - from) * ratio, label);
    };

    updateProgress('Loading scene assets...');

    for (const splat of splatAssets) {
      await this._loadSingleSplat(splat, { required: requireEverySplat });
      done += 1;
      updateProgress(`Loaded SPZ ${done}/${splatAssets.length}`);
    }

    const loadedSplatCount = this.splatEntries.length - splatsBeforeLoad;
    if (requireEverySplat && loadedSplatCount !== splatAssets.length) {
      throw new Error(
        `Scene startup stopped: loaded ${loadedSplatCount} of ${splatAssets.length} SPZ files.`,
      );
    }

    for (const mesh of meshAssets) {
      await this._loadSingleMesh(mesh);
      done += 1;
      updateProgress(`Loaded mesh ${done}/${total}`);
    }

    if (this.meshEntries.length === 0 && this.splatEntries.length === 0) {
      throw new Error('No renderable assets were loaded from metadata.');
    }
  }

  async _loadSingleSplat(asset, { required = false } = {}) {
    if (!this.SplatMeshCtor) {
      const error = new Error(`Spark is unavailable; cannot load ${asset.relativePath}.`);
      if (required) {
        throw error;
      }
      console.warn('[splat] skipped', asset.relativePath, error);
      return false;
    }

    let splatObject = null;
    try {
      splatObject = new this.SplatMeshCtor({
        url: asset.url,
        lod: true,
        raycastable: true,
        minRaycastOpacity: 0.24,
      });

      if (!splatObject?.initialized || typeof splatObject.initialized.then !== 'function') {
        throw new Error('Spark did not provide an initialization promise.');
      }

      await splatObject.initialized;

      if (required) {
        if (splatObject.isInitialized !== true) {
          throw new Error('Spark initialization did not complete.');
        }
      }

      splatObject.name = asset.name || asset.fileName;
      applyAssetTransform(splatObject, asset.transform);
      splatObject.updateMatrixWorld(true);
      if (this.renderer.xr.isPresenting && this.activeXrSessionMode === XR_SESSION_MODE_VR) {
        // A portal can replace the scene while the native compositor remains
        // open. Reveal newly uploaded SPZ files progressively instead of
        // drawing every new splat in the museum's first stereo frame.
        splatObject.visible = false;
      }
      this.scene.add(splatObject);

      this.splatEntries.push({
        asset,
        object: splatObject,
      });
      return true;
    } catch (error) {
      if (splatObject && typeof splatObject.dispose === 'function') {
        splatObject.dispose();
      }
      if (required) {
        throw new Error(`Failed to fully load ${asset.relativePath}: ${error?.message ?? error}`);
      }
      console.warn(`[splat] failed to load ${asset.relativePath}`, error);
      return false;
    }
  }

  async _loadSingleMesh(asset) {
    try {
      const gltf = await this.gltfLoader.loadAsync(asset.url);
      const root = gltf.scene;
      this._configureSharpModelMaterials(root);
      root.name = asset.name || asset.fileName;
      const isDoorAsset = String(asset.fileName || asset.relativePath || asset.name || '')
        .toLowerCase()
        .includes('doorglb');

      applyAssetTransform(root, asset.transform);
      root.updateMatrixWorld(true);

      root.traverse((child) => {
        if (!child.isMesh) {
          return;
        }

        child.castShadow = false;
        child.receiveShadow = true;
        child.frustumCulled = true;

        if (isDoorAsset) {
          child.userData.interaction = {
            assetId: asset.id,
            name: asset.fileName || asset.relativePath || child.name || root.name,
            suppressPanel: true,
            maxDistance: DOOR_INTERACTION_MAX_DISTANCE,
            metadata: {
              fileName: asset.fileName,
              relativePath: asset.relativePath,
              ...asset.metadata,
              // Asset metadata must never turn the church portal back into a
              // generic model, because the VR gaze rules use this type to
              // keep the door clickable without making it a floor blocker.
              type: 'door',
            },
          };

          this.pickableMeshes.push(child);
        }
      });

      this.scene.add(root);
      this.meshEntries.push({
        asset,
        root,
      });
    } catch (error) {
      console.warn(`[mesh] failed to load ${asset.relativePath}`, error);
    }
  }

  _getActiveHotspotMarkers() {
    if (this._isUndergroundScene()) {
      return UNDERGROUND_HOTSPOT_MARKERS;
    }
    if (this._isMuseumScene()) {
      return MUSEUM_HOTSPOT_MARKERS;
    }
    return CHURCH_HOTSPOT_MARKERS;
  }

  _getHotspotConfig(hotspotId) {
    return this._getActiveHotspotMarkers().find((hotspot) => hotspot.id === hotspotId) ?? null;
  }

  _createHotspotIconTexture(color, iconType = 'arrow') {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;

    const context = canvas.getContext('2d');
    if (!context) {
      return null;
    }
    context.scale(2, 2);

    const accent = new THREE.Color(color).getStyle();
    const center = 128;
    const radius = 94;

    context.clearRect(0, 0, canvas.width, canvas.height);

    // Soft outer halo keeps the portal legible against both bright splats and
    // dark interiors without giving it any three-dimensional volume.
    const halo = context.createRadialGradient(center, center, 68, center, center, 122);
    halo.addColorStop(0, 'rgba(212, 175, 106, 0.18)');
    halo.addColorStop(0.72, 'rgba(212, 175, 106, 0.08)');
    halo.addColorStop(1, 'rgba(212, 175, 106, 0)');
    context.fillStyle = halo;
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.beginPath();
    context.arc(center, center, radius, 0, Math.PI * 2);
    context.fillStyle = 'rgba(13, 10, 4, 0.94)';
    context.fill();

    context.lineWidth = 12;
    context.strokeStyle = accent;
    context.stroke();

    context.beginPath();
    context.arc(center, center, radius - 17, 0, Math.PI * 2);
    context.lineWidth = 3;
    context.strokeStyle = 'rgba(250, 247, 242, 0.28)';
    context.stroke();

    context.beginPath();
    context.lineWidth = 18;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.strokeStyle = '#faf7f2';

    if (iconType === 'open') {
      // A plus-shaped Open control. The same world-space button changes to
      // Close while its museum exhibit is displayed.
      context.moveTo(88, 128);
      context.lineTo(168, 128);
      context.moveTo(128, 88);
      context.lineTo(128, 168);
    } else if (iconType === 'close') {
      context.moveTo(94, 94);
      context.lineTo(162, 162);
      context.moveTo(162, 94);
      context.lineTo(94, 162);
    } else {
      // Scene portals retain the forward-arrow symbol.
      context.moveTo(78, 128);
      context.lineTo(170, 128);
      context.moveTo(137, 94);
      context.lineTo(171, 128);
      context.lineTo(137, 162);
    }
    context.stroke();

    return this._configureSharpUiTexture(new THREE.CanvasTexture(canvas));
  }

  _shouldUsePhoneVrGazeTeleport() {
    if (!this.mobileMode) {
      return false;
    }

    if (!this.renderer.xr.isPresenting) {
      return false;
    }

    const session = this.renderer.xr.getSession?.();
    if (!session || this.activeXrSessionMode !== XR_SESSION_MODE_VR) {
      return false;
    }

    // A tracked controller with axes already has thumbstick locomotion. Gaze
    // teleport is reserved for controller-free phone viewers.
    const hasLocomotionController = Array.from(session.inputSources || []).some((source) => (
      source?.targetRayMode === 'tracked-pointer'
      && Boolean(source?.gripSpace)
      && Number(source?.gamepad?.axes?.length || 0) >= 2
    ));
    return !hasLocomotionController;
  }

  _shouldUsePhoneVrGazeInteraction() {
    if (!this.mobileMode) {
      return false;
    }

    return Boolean(
      this.renderer.xr.isPresenting
      && this.renderer.xr.getSession?.()
      && this.activeXrSessionMode === XR_SESSION_MODE_VR,
    );
  }

  _createMuseumArtifactControlTexture(label, active = false) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext('2d');
    if (!context) {
      return null;
    }
    context.scale(2, 2);

    context.clearRect(0, 0, 256, 256);
    const halo = context.createRadialGradient(128, 128, 72, 128, 128, 124);
    halo.addColorStop(0, active ? 'rgba(212, 175, 106, 0.26)' : 'rgba(212, 175, 106, 0.14)');
    halo.addColorStop(1, 'rgba(212, 175, 106, 0)');
    context.fillStyle = halo;
    context.fillRect(0, 0, 256, 256);

    context.beginPath();
    context.arc(128, 128, 96, 0, Math.PI * 2);
    context.fillStyle = active ? 'rgba(212, 175, 106, 0.98)' : 'rgba(13, 10, 4, 0.96)';
    context.fill();
    context.lineWidth = 10;
    context.strokeStyle = active ? '#faf7f2' : '#d4af6a';
    context.stroke();

    const normalizedLabel = String(label || '').trim();
    context.fillStyle = active ? '#1c1208' : '#faf7f2';
    context.font = normalizedLabel.length > 3
      ? '700 38px Inter, Arial, sans-serif'
      : normalizedLabel.length > 2
        ? '800 54px Inter, Arial, sans-serif'
        : '800 92px Inter, Arial, sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(normalizedLabel, 128, 132);

    return this._configureSharpUiTexture(new THREE.CanvasTexture(canvas));
  }

  _wrapMuseumArtifactText(context, text, maxWidth) {
    const lines = [];
    const paragraphs = String(text || '').split(/\n+/);
    for (const paragraph of paragraphs) {
      const words = paragraph.trim().split(/\s+/).filter(Boolean);
      if (!words.length) {
        if (lines.length && lines[lines.length - 1] !== '') {
          lines.push('');
        }
        continue;
      }
      let line = words.shift();
      for (const word of words) {
        const candidate = `${line} ${word}`;
        if (context.measureText(candidate).width <= maxWidth) {
          line = candidate;
        } else {
          lines.push(line);
          line = word;
        }
      }
      lines.push(line);
    }
    return lines;
  }

  _createMuseumArtifactTextTexture(text, { subtitle = false, contentFit = false } = {}) {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = subtitle ? (contentFit ? 640 : 512) : 180;
    const context = canvas.getContext('2d');
    if (!context) {
      return null;
    }

    context.clearRect(0, 0, canvas.width, canvas.height);
    if (subtitle) {
      context.beginPath();
      if (typeof context.roundRect === 'function') {
        context.roundRect(12, 12, canvas.width - 24, canvas.height - 24, 32);
      } else {
        context.rect(12, 12, canvas.width - 24, canvas.height - 24);
      }
      context.fillStyle = 'rgba(13, 10, 4, 0.93)';
      context.fill();
      context.lineWidth = 5;
      context.strokeStyle = 'rgba(212, 175, 106, 0.92)';
      context.stroke();
    }

    let fontSize = subtitle ? (contentFit ? 38 : 40) : 72;
    const maxLines = subtitle ? (contentFit ? 20 : 11) : 2;
    const minimumFontSize = subtitle ? (contentFit ? 20 : 27) : 52;
    const maxWidth = canvas.width - (subtitle ? 96 : 48);
    const availableHeight = canvas.height - (subtitle ? 88 : 28);
    let lines = [];
    do {
      context.font = `${subtitle ? 500 : 700} ${fontSize}px ${subtitle ? 'Georgia' : 'Georgia'}, serif`;
      lines = this._wrapMuseumArtifactText(context, text, maxWidth);
      const candidateLineHeight = fontSize * (subtitle ? (contentFit ? 1.32 : 1.28) : 1.12);
      const fitsWidthAndHeight = lines.length <= maxLines
        && Math.max(1, lines.length) * candidateLineHeight <= availableHeight;
      if (fitsWidthAndHeight || fontSize <= minimumFontSize) {
        break;
      }
      fontSize -= 2;
    } while (fontSize >= minimumFontSize);

    const lineHeight = fontSize * (subtitle ? (contentFit ? 1.32 : 1.28) : 1.12);
    const contentHeight = Math.max(1, lines.length) * lineHeight;
    let y = (canvas.height - contentHeight) * 0.5 + lineHeight * 0.72;
    context.fillStyle = subtitle ? '#faf7f2' : '#d4af6a';
    context.textAlign = 'center';
    context.textBaseline = 'alphabetic';
    lines.slice(0, maxLines).forEach((line) => {
      context.fillText(line, canvas.width * 0.5, y);
      y += lineHeight;
    });

    return this._configureSharpUiTexture(new THREE.CanvasTexture(canvas));
  }

  _createMuseumArtifactSprite({ texture, position, scale, interactionName = '' }) {
    if (!texture) {
      return null;
    }
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    }));
    sprite.position.set(position[0], position[1], position[2]);
    sprite.scale.set(scale[0], scale[1], 1);
    sprite.renderOrder = 60;
    if (interactionName) {
      sprite.userData.isMuseumArtifactPickable = true;
      sprite.userData.interaction = {
        name: interactionName,
        suppressPanel: true,
        maxDistance: MUSEUM_ARTIFACT_INTERACTION_MAX_DISTANCE,
        metadata: { type: 'museum-artifact-control' },
      };
      this.pickableMeshes.push(sprite);
    }
    return sprite;
  }

  _replaceMuseumArtifactSpriteTexture(sprite, texture) {
    if (!sprite || !texture) {
      return;
    }
    const oldTexture = sprite.material?.map || null;
    const materials = new Set([sprite.material]);
    const selected = this.interactionSystem?.selected;
    if (selected?.mesh === sprite && selected.originalMaterial) {
      materials.add(selected.originalMaterial);
    }
    materials.forEach((material) => {
      material.map = texture;
      material.needsUpdate = true;
    });
    if (oldTexture && oldTexture !== texture) {
      oldTexture.dispose?.();
    }
  }

  _setupMuseumArtifactStation() {
    if (!this._isMuseumScene() || this.museumArtifactStation.root) {
      return;
    }

    const station = this.museumArtifactStation;
    const root = new THREE.Group();
    root.name = 'museum-floating-artifact-station';
    root.position.set(...MUSEUM_ARTIFACT_POSITION);
    root.visible = false;

    const modelPivot = new THREE.Group();
    modelPivot.name = 'museum-floating-artifact-model';
    modelPivot.rotation.x = MUSEUM_ARTIFACT_FORWARD_TILT;
    root.add(modelPivot);

    const controlsRoot = new THREE.Group();
    controlsRoot.name = 'museum-floating-artifact-controls';
    root.add(controlsRoot);

    const previous = this._createMuseumArtifactSprite({
      texture: this._createMuseumArtifactControlTexture('←'),
      position: [-0.90, 0.48, 0],
      scale: [0.21, 0.21],
      interactionName: 'museum-artifact-prev',
    });
    const next = this._createMuseumArtifactSprite({
      texture: this._createMuseumArtifactControlTexture('→'),
      position: [0.90, 0.48, 0],
      scale: [0.21, 0.21],
      interactionName: 'museum-artifact-next',
    });
    controlsRoot.add(previous, next);

    const titleSprite = this._createMuseumArtifactSprite({
      texture: this._createMuseumArtifactTextTexture(''),
      position: [0, -0.12, 0],
      scale: [0.92, 0.16],
    });
    const subtitleSprite = this._createMuseumArtifactSprite({
      texture: this._createMuseumArtifactTextTexture('', { subtitle: true }),
      position: [0, -0.58, 0],
      scale: [1.65, 0.62],
    });
    subtitleSprite.visible = false;
    root.add(titleSprite, subtitleSprite);

    const toggleSprite = this._createMuseumArtifactSprite({
      texture: this._createMuseumArtifactControlTexture('OPEN'),
      position: MUSEUM_ARTIFACT_TOGGLE_POSITION,
      scale: [0.25, 0.25],
      interactionName: 'museum-artifact-toggle',
    });
    const languageSprite = this._createMuseumArtifactSprite({
      texture: this._createMuseumArtifactControlTexture('TL'),
      position: [MUSEUM_ARTIFACT_TOGGLE_POSITION[0] - 0.29, MUSEUM_ARTIFACT_TOGGLE_POSITION[1], MUSEUM_ARTIFACT_TOGGLE_POSITION[2]],
      scale: [0.21, 0.21],
      interactionName: 'museum-artifact-language',
    });
    const subtitleToggleSprite = this._createMuseumArtifactSprite({
      texture: this._createMuseumArtifactControlTexture('CC'),
      position: [MUSEUM_ARTIFACT_TOGGLE_POSITION[0] + 0.29, MUSEUM_ARTIFACT_TOGGLE_POSITION[1], MUSEUM_ARTIFACT_TOGGLE_POSITION[2]],
      scale: [0.21, 0.21],
      interactionName: 'museum-artifact-subtitles',
    });
    languageSprite.visible = false;
    subtitleToggleSprite.visible = false;

    this.scene.add(root, toggleSprite, languageSprite, subtitleToggleSprite);
    station.root = root;
    station.modelPivot = modelPivot;
    station.controlsRoot = controlsRoot;
    station.titleSprite = titleSprite;
    station.subtitleSprite = subtitleSprite;
    station.toggleSprite = toggleSprite;
    station.languageSprite = languageSprite;
    station.subtitleToggleSprite = subtitleToggleSprite;

    const audio = new Audio();
    audio.preload = 'metadata';
    audio.playsInline = true;
    station.audio = audio;
    this._refreshMuseumArtifactPresentation();
  }

  _disposeMuseumArtifactStation() {
    const station = this.museumArtifactStation;
    if (!station) {
      return;
    }

    this._stopMuseumArtifactNarration();
    station.loadToken += 1;

    const roots = [
      station.root,
      station.toggleSprite,
      station.languageSprite,
      station.subtitleToggleSprite,
    ].filter(Boolean);
    const removedObjects = new Set();

    roots.forEach((root) => {
      root.traverse((object) => removedObjects.add(object));
      root.parent?.remove(root);
      this._disposeObject3DResources(root);
    });

    this.pickableMeshes = this.pickableMeshes.filter((object) => !removedObjects.has(object));
    station.audio = null;
    station.root = null;
    station.modelPivot = null;
    station.currentModel = null;
    station.controlsRoot = null;
    station.titleSprite = null;
    station.subtitleSprite = null;
    station.toggleSprite = null;
    station.languageSprite = null;
    station.subtitleToggleSprite = null;
    station.isOpen = false;
    station.modelCache.clear();
    station.elapsed = 0;
  }

  _setMuseumArtifactStationOpen(open) {
    if (!this._isMuseumScene() || !this.museumArtifactStation.root) {
      return;
    }
    const station = this.museumArtifactStation;
    station.isOpen = Boolean(open);
    // Reapply the authored world position whenever the station opens. This
    // prevents a stale or externally mutated transform from leaving desktop
    // viewers with the artifact pivot at ground level.
    station.root.position.set(...MUSEUM_ARTIFACT_POSITION);
    station.root.visible = station.isOpen;
    station.languageSprite.visible = station.isOpen;
    station.subtitleToggleSprite.visible = station.isOpen;
    this._replaceMuseumArtifactSpriteTexture(
      station.toggleSprite,
      this._createMuseumArtifactControlTexture(station.isOpen ? 'CLOSE' : 'OPEN', station.isOpen),
    );

    if (!station.isOpen) {
      this._stopMuseumArtifactNarration();
      return;
    }
    this._refreshMuseumArtifactPresentation();
    void this._showMuseumArtifact(station.index, { playNarration: true });
  }

  _stepMuseumArtifact(direction) {
    const station = this.museumArtifactStation;
    if (!station.isOpen || !MUSEUM_ARTIFACTS.length) {
      return;
    }
    const nextIndex = (station.index + direction + MUSEUM_ARTIFACTS.length) % MUSEUM_ARTIFACTS.length;
    void this._showMuseumArtifact(nextIndex, { playNarration: true });
  }

  _toggleMuseumArtifactLanguage() {
    const station = this.museumArtifactStation;
    if (!station.isOpen) {
      return;
    }
    station.language = station.language === 'tl' ? 'en' : 'tl';
    this._refreshMuseumArtifactPresentation();
    this._playMuseumArtifactNarration();
  }

  _toggleMuseumArtifactSubtitles() {
    const station = this.museumArtifactStation;
    if (!station.isOpen) {
      return;
    }
    station.subtitlesOn = !station.subtitlesOn;
    this._refreshMuseumArtifactPresentation();
  }

  _getCurrentMuseumArtifact() {
    return MUSEUM_ARTIFACTS[this.museumArtifactStation.index] || null;
  }

  async _showMuseumArtifact(index, { playNarration = false } = {}) {
    const station = this.museumArtifactStation;
    if (!station.root || !station.isOpen || !MUSEUM_ARTIFACTS.length) {
      return;
    }

    station.index = (index + MUSEUM_ARTIFACTS.length) % MUSEUM_ARTIFACTS.length;
    const artifact = this._getCurrentMuseumArtifact();
    const loadToken = ++station.loadToken;
    this._stopMuseumArtifactNarration();
    this._refreshMuseumArtifactPresentation({ loading: true });

    try {
      let modelPromise = station.modelCache.get(artifact.id);
      if (!modelPromise) {
        modelPromise = this._loadAndNormalizeMuseumArtifact(artifact);
        station.modelCache.set(artifact.id, modelPromise);
      }
      const model = await modelPromise;
      if (loadToken !== station.loadToken || !station.isOpen) {
        return;
      }

      if (station.currentModel && station.currentModel.parent === station.modelPivot) {
        station.modelPivot.remove(station.currentModel);
      }
      station.currentModel = model;
      station.modelPivot.add(model);
      // Present the opposite side first, then continue the slow exhibit spin.
      station.modelPivot.rotation.x = MUSEUM_ARTIFACT_FORWARD_TILT;
      station.modelPivot.rotation.y = Math.PI;
      this._refreshMuseumArtifactPresentation();
      if (playNarration) {
        this._playMuseumArtifactNarration();
      }
    } catch (error) {
      station.modelCache.delete(artifact.id);
      console.warn(`[museum artifact] Could not load ${artifact.modelUrl}`, error);
      if (loadToken === station.loadToken) {
        this._refreshMuseumArtifactPresentation({ unavailable: true });
        this.uiController.showError('This artifact could not be loaded. Use an arrow to try another artifact.', 3200);
      }
    }
  }

  async _loadAndNormalizeMuseumArtifact(artifact) {
    const gltf = await this.gltfLoader.loadAsync(artifact.modelUrl);
    const content = gltf.scene || gltf.scenes?.[0];
    if (!content) {
      throw new Error('The GLB contains no displayable scene.');
    }
    this._configureSharpModelMaterials(content);

    const degrees = artifact.rotation || [0, 0, 0];
    content.rotation.set(
      THREE.MathUtils.degToRad(degrees[0] || 0),
      THREE.MathUtils.degToRad(degrees[1] || 0),
      THREE.MathUtils.degToRad(degrees[2] || 0),
    );
    content.traverse((child) => {
      if (!child.isMesh) {
        return;
      }
      child.frustumCulled = false;
      child.castShadow = false;
      child.receiveShadow = false;
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((material) => {
        if (material?.map) {
          material.map.colorSpace = THREE.SRGBColorSpace;
          material.map.needsUpdate = true;
        }
      });
    });

    content.updateMatrixWorld(true);
    let bounds = new THREE.Box3().setFromObject(content);
    const size = new THREE.Vector3();
    bounds.getSize(size);
    const largestDimension = Math.max(size.x, size.y, size.z);
    if (!Number.isFinite(largestDimension) || largestDimension <= 0) {
      throw new Error('The GLB has invalid bounds.');
    }
    const scale = MUSEUM_ARTIFACT_DISPLAY_SIZE / largestDimension;
    content.scale.multiplyScalar(scale);
    content.updateMatrixWorld(true);

    bounds = new THREE.Box3().setFromObject(content);
    const center = new THREE.Vector3();
    bounds.getCenter(center);
    content.position.x -= center.x;
    content.position.y -= bounds.min.y;
    content.position.z -= center.z;

    const normalized = new THREE.Group();
    normalized.name = `museum-artifact-${artifact.id}`;
    normalized.add(content);
    return normalized;
  }

  _refreshMuseumArtifactPresentation({ loading = false, unavailable = false } = {}) {
    const station = this.museumArtifactStation;
    const artifact = this._getCurrentMuseumArtifact();
    if (!station.root || !artifact) {
      return;
    }

    const language = station.language === 'en' ? 'en' : 'tl';
    let title = artifact.title?.[language] || artifact.title?.en || artifact.id;
    if (loading) {
      title = language === 'tl' ? `${title} · Inihahanda…` : `${title} · Loading…`;
    } else if (unavailable) {
      title = language === 'tl' ? `${title} · Hindi mabuksan` : `${title} · Unavailable`;
    }
    this._replaceMuseumArtifactSpriteTexture(
      station.titleSprite,
      this._createMuseumArtifactTextTexture(title),
    );
    this._replaceMuseumArtifactSpriteTexture(
      station.languageSprite,
      this._createMuseumArtifactControlTexture(language.toUpperCase(), true),
    );
    this._replaceMuseumArtifactSpriteTexture(
      station.subtitleToggleSprite,
      this._createMuseumArtifactControlTexture('CC', station.subtitlesOn),
    );

    const subtitleKey = artifact.subtitleKey || artifact.id;
    const subtitleRecord = window.NHCP_ARTIFACT_SUBTITLES?.[subtitleKey] || null;
    const subtitleText = subtitleRecord?.[language] || '';
    if (subtitleText) {
      this._replaceMuseumArtifactSpriteTexture(
        station.subtitleSprite,
        this._createMuseumArtifactTextTexture(subtitleText, { subtitle: true }),
      );
    }
    station.subtitleSprite.visible = Boolean(station.isOpen && station.subtitlesOn && subtitleText);
  }

  _playMuseumArtifactNarration() {
    const station = this.museumArtifactStation;
    const artifact = this._getCurrentMuseumArtifact();
    if (!station.isOpen || !station.audio || !artifact) {
      return;
    }
    const language = station.language === 'en' ? 'en' : 'tl';
    const source = artifact.audio?.[language] || artifact.audio?.tl || artifact.audio?.en || '';
    if (!source) {
      return;
    }
    station.audio.pause();
    station.audio.src = source;
    station.audio.currentTime = 0;
    this._updateMuseumArtifactAudioVolume();
    const playing = station.audio.play();
    if (playing?.catch) {
      playing.catch((error) => {
        console.warn('[museum artifact] Narration could not autoplay.', error);
      });
    }
  }

  _stopMuseumArtifactNarration() {
    const audio = this.museumArtifactStation.audio;
    if (!audio) {
      return;
    }
    audio.pause();
    audio.currentTime = 0;
  }

  _updateMuseumArtifactAudioVolume() {
    const station = this.museumArtifactStation;
    if (!station.audio || !this.playerRig) {
      return;
    }
    const distance = Math.hypot(
      this.playerRig.position.x - MUSEUM_ARTIFACT_POSITION[0],
      this.playerRig.position.z - MUSEUM_ARTIFACT_POSITION[2],
    );
    const normalized = THREE.MathUtils.clamp(
      (distance - MUSEUM_ARTIFACT_AUDIO_NEAR_DISTANCE)
        / (MUSEUM_ARTIFACT_AUDIO_FAR_DISTANCE - MUSEUM_ARTIFACT_AUDIO_NEAR_DISTANCE),
      0,
      1,
    );
    const eased = (1 - normalized) * (1 - normalized);
    station.audio.volume = MUSEUM_ARTIFACT_AUDIO_MIN_VOLUME
      + (1 - MUSEUM_ARTIFACT_AUDIO_MIN_VOLUME) * eased;
  }

  _updateMuseumArtifactStation(dt) {
    const station = this.museumArtifactStation;
    if (!station.root || !station.isOpen) {
      return;
    }
    station.elapsed += dt;
    if (station.modelPivot) {
      station.modelPivot.position.y = Math.sin(station.elapsed * 1.15) * 0.025;
      station.modelPivot.rotation.y += dt * 0.22;
    }
    this._updateMuseumArtifactAudioVolume();
  }

  _createMuseumContentControl({ parent, label, position, scale = 0.2, name }) {
    const sprite = this._createMuseumArtifactSprite({
      texture: this._createMuseumArtifactControlTexture(label),
      position,
      scale: [scale, scale],
      interactionName: name,
    });
    if (!sprite || !parent) {
      return null;
    }
    sprite.userData.isMuseumContentPickable = true;
    if (sprite.userData.interaction) {
      sprite.userData.interaction.maxDistance = MUSEUM_CONTENT_INTERACTION_MAX_DISTANCE;
      sprite.userData.interaction.metadata = { type: 'museum-content-control' };
    }
    parent.add(sprite);
    return sprite;
  }

  _setMuseumContentHotspotOpenState(marker, isOpen, viewerRoot = null) {
    const icon = marker?.userData?.hotspotIcon;
    if (!marker || !icon?.material) {
      return;
    }

    const hotspot = MUSEUM_CONTENT_HOTSPOTS[marker.name];
    const markerConfig = this._getHotspotConfig(marker.name);
    if (!hotspot || !markerConfig) {
      return;
    }

    this._replaceMuseumArtifactSpriteTexture(
      icon,
      this._createMuseumArtifactControlTexture(isOpen ? 'CLOSE' : 'OPEN', isOpen),
    );

    icon.parent?.remove(icon);
    marker.add(icon);
    icon.position.set(0, 0, 0);
    if (isOpen) {
      // Keep CLOSE exactly where OPEN was, matching the original exhibit.
      icon.scale.set(0.16, 0.16, 1);
      icon.renderOrder = 62;
      icon.userData.museumContentOpen = true;
      return;
    }

    icon.scale.set(0.18, 0.18, 1);
    icon.renderOrder = 6;
    icon.userData.museumContentOpen = false;
  }

  _openMuseumContentViewer(hotspotId) {
    const content = MUSEUM_CONTENT_HOTSPOTS[hotspotId];
    if (!this._isMuseumScene() || !content?.entries?.length || !this.camera) {
      return;
    }

    this._disposeMuseumContentViewer();
    const viewer = this.museumContentViewer;
    viewer.hotspotId = hotspotId;
    viewer.entries = content.entries;
    viewer.index = 0;
    viewer.isOpen = true;
    viewer.subtitlesOn = true;
    viewer.sourceMarker = this.hotspotMarkers.find((marker) => marker.name === hotspotId) || null;

    const root = new THREE.Group();
    root.name = 'museum-content-viewer';
    const cameraPosition = new THREE.Vector3();
    this.camera.getWorldPosition(cameraPosition);
    if (Array.isArray(content.displayPosition)) {
      root.position.fromArray(content.displayPosition);
    } else if (viewer.sourceMarker) {
      viewer.sourceMarker.getWorldPosition(root.position);
    } else {
      root.position.fromArray(content.position);
    }
    const uprightLookTarget = cameraPosition.clone();
    uprightLookTarget.y = root.position.y;
    root.lookAt(uprightLookTarget);
    root.userData.splatOccluded = false;
    root.userData.splatOcclusionMargin = 0.12;

    const mediaRoot = new THREE.Group();
    mediaRoot.name = 'museum-content-media';
    mediaRoot.position.set(0, 0.34, 0.08);
    mediaRoot.rotation.set(MUSEUM_CONTENT_FORWARD_TILT, Math.PI, 0);
    root.add(mediaRoot);

    const titleSprite = this._createMuseumArtifactSprite({
      texture: this._createMuseumArtifactTextTexture(''),
      position: Array.isArray(content.titlePosition)
        ? content.titlePosition
        : [0, -0.12, 0.09],
      scale: [0.92, 0.16],
    });
    const subtitleSprite = this._createMuseumArtifactSprite({
      texture: this._createMuseumArtifactTextTexture('', { subtitle: true, contentFit: true }),
      position: Array.isArray(content.subtitlePosition)
        ? content.subtitlePosition
        : [0, -0.72, 0.09],
      scale: [1.65, 0.54],
    });
    root.add(titleSprite, subtitleSprite);

    const previousSprite = this._createMuseumContentControl({
      parent: root,
      label: '←',
      position: [-0.90, 0.48, 0.12],
      scale: 0.18,
      name: 'museum-content-prev',
    });
    const nextSprite = this._createMuseumContentControl({
      parent: root,
      label: '→',
      position: [0.90, 0.48, 0.12],
      scale: 0.18,
      name: 'museum-content-next',
    });
    const languageSprite = this._createMuseumContentControl({
      parent: root,
      label: viewer.language.toUpperCase(),
      position: [0.24, -0.33, 0.12],
      scale: 0.16,
      name: 'museum-content-language',
    });
    const subtitleToggleSprite = this._createMuseumContentControl({
      parent: root,
      label: 'CC',
      position: [0, -0.33, 0.12],
      scale: 0.16,
      name: 'museum-content-subtitles',
    });
    viewer.root = root;
    viewer.mediaRoot = mediaRoot;
    viewer.titleSprite = titleSprite;
    viewer.subtitleSprite = subtitleSprite;
    viewer.previousSprite = previousSprite;
    viewer.nextSprite = nextSprite;
    viewer.languageSprite = languageSprite;
    viewer.subtitleToggleSprite = subtitleToggleSprite;
    viewer.audio = new Audio();
    viewer.audio.preload = 'auto';
    viewer.audio.playsInline = true;
    this.scene.add(root);
    this._setMuseumContentHotspotOpenState(viewer.sourceMarker, true, root);

    // Keep the supporting controls around the original hotspot. Selected
    // exhibits use the museum's depth axis: CC toward +Z, CLOSE at the
    // hotspot, and TL/EN toward -Z.
    if (viewer.sourceMarker) {
      subtitleToggleSprite.parent?.remove(subtitleToggleSprite);
      languageSprite.parent?.remove(languageSprite);
      viewer.sourceMarker.add(subtitleToggleSprite, languageSprite);
      if (content.controlsAlongZ) {
        subtitleToggleSprite.position.set(0, 0, 0.22);
        languageSprite.position.set(0, 0, -0.22);
      } else {
        subtitleToggleSprite.position.set(-0.22, 0, 0.02);
        languageSprite.position.set(0.22, 0, 0.02);
      }
      subtitleToggleSprite.renderOrder = 61;
      languageSprite.renderOrder = 61;
    }

    this._refreshMuseumContentPresentation();
    void this._showMuseumContentEntry(0, { playNarration: true });
  }

  _getCurrentMuseumContentEntry() {
    const viewer = this.museumContentViewer;
    return viewer.entries[viewer.index] || null;
  }

  _stepMuseumContent(direction) {
    const viewer = this.museumContentViewer;
    if (!viewer.isOpen || viewer.entries.length < 2) {
      return;
    }
    const nextIndex = (viewer.index + direction + viewer.entries.length) % viewer.entries.length;
    void this._showMuseumContentEntry(nextIndex, { playNarration: true });
  }

  _toggleMuseumContentLanguage() {
    const viewer = this.museumContentViewer;
    if (!viewer.isOpen) {
      return;
    }
    viewer.language = viewer.language === 'tl' ? 'en' : 'tl';
    this._refreshMuseumContentPresentation();
    this._playMuseumContentNarration();
  }

  _toggleMuseumContentSubtitles() {
    const viewer = this.museumContentViewer;
    if (!viewer.isOpen) {
      return;
    }
    viewer.subtitlesOn = !viewer.subtitlesOn;
    this._refreshMuseumContentPresentation();
  }

  _configureMuseumContentDisplayMaterials(root) {
    if (!root?.traverse) {
      return;
    }

    root.traverse((object) => {
      if (!object?.isMesh) {
        return;
      }

      const sourceMaterials = Array.isArray(object.material)
        ? object.material
        : [object.material];
      const displayMaterials = sourceMaterials.map((material) => {
        if (!material) {
          return material;
        }

        const map = material.map || material.emissiveMap || null;
        if (map) {
          map.colorSpace = THREE.SRGBColorSpace;
          map.needsUpdate = true;
        }

        const displayMaterial = new THREE.MeshBasicMaterial({
          color: material.color?.clone?.() || new THREE.Color(0xffffff),
          map,
          alphaMap: material.alphaMap || null,
          transparent: Boolean(material.transparent) || Number(material.opacity) < 1,
          opacity: Number.isFinite(Number(material.opacity)) ? Number(material.opacity) : 1,
          alphaTest: Number.isFinite(Number(material.alphaTest)) ? Number(material.alphaTest) : 0,
          side: material.side ?? THREE.FrontSide,
          vertexColors: Boolean(material.vertexColors),
          depthTest: true,
          depthWrite: !material.transparent,
          toneMapped: false,
        });
        displayMaterial.name = `${material.name || 'artifact'}-museum-display`;
        return displayMaterial;
      });

      object.material = Array.isArray(object.material)
        ? displayMaterials
        : displayMaterials[0];
      // Draw the colored GLB after the background panel while retaining the
      // model's own depth relationships.
      object.renderOrder = 58;
    });
  }

  async _showMuseumContentEntry(index, { playNarration = false } = {}) {
    const viewer = this.museumContentViewer;
    if (!viewer.isOpen || !viewer.mediaRoot || !viewer.entries.length) {
      return;
    }

    viewer.index = (index + viewer.entries.length) % viewer.entries.length;
    const entry = this._getCurrentMuseumContentEntry();
    const loadToken = ++viewer.loadToken;
    this._stopMuseumContentNarration();
    this._clearMuseumContentMedia();
    this._refreshMuseumContentPresentation({ loading: true });
    if (playNarration) {
      this._playMuseumContentNarration();
    }

    try {
      let media = null;
      if (entry.modelUrl) {
        media = await this._loadAndNormalizeMuseumArtifact(entry);
        media.scale.multiplyScalar(MUSEUM_CONTENT_DISPLAY_SIZE / MUSEUM_ARTIFACT_DISPLAY_SIZE);
        this._configureMuseumContentDisplayMaterials(media);
        media.userData.isMuseumContentModel = true;
      } else if (entry.imageUrl) {
        media = await this._loadMuseumContentImage(entry.imageUrl);
      }
      if (loadToken !== viewer.loadToken || !viewer.isOpen) {
        this._disposeObject3DResources(media);
        return;
      }
      if (media) {
        if (media.userData?.isMuseumContentImage) {
          viewer.mediaRoot.rotation.set(0, 0, 0);
        } else if (media.userData?.isMuseumContentModel) {
          viewer.mediaRoot.rotation.set(
            entry.disableTilt ? 0 : MUSEUM_CONTENT_FORWARD_TILT,
            Math.PI,
            0,
          );
        }
        viewer.currentMedia = media;
        viewer.mediaRoot.add(media);
      }
      this._refreshMuseumContentPresentation();
    } catch (error) {
      console.warn('[museum content] Could not load exhibit media.', entry?.id, error);
      if (loadToken === viewer.loadToken && viewer.isOpen) {
        this._refreshMuseumContentPresentation({ unavailable: true });
        this.uiController.showError('This museum exhibit could not be displayed. Try opening it again.', 3200);
      }
    }
  }

  _loadMuseumContentImage(imageUrl) {
    return new Promise((resolve, reject) => {
      new THREE.TextureLoader().load(
        imageUrl,
        (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          const width = Number(texture.image?.naturalWidth ?? texture.image?.width ?? 1);
          const height = Number(texture.image?.naturalHeight ?? texture.image?.height ?? 1);
          const aspect = width / Math.max(1, height);
          let planeWidth = 1.18;
          let planeHeight = planeWidth / Math.max(0.1, aspect);
          if (planeHeight > 0.72) {
            planeHeight = 0.72;
            planeWidth = planeHeight * aspect;
          }
          const image = new THREE.Mesh(
            new THREE.PlaneGeometry(planeWidth, planeHeight),
            new THREE.MeshBasicMaterial({
              map: texture,
              transparent: true,
              side: THREE.DoubleSide,
              depthTest: false,
              depthWrite: false,
              toneMapped: false,
            }),
          );
          image.position.y = -0.12;
          image.renderOrder = 59;
          image.userData.isMuseumContentImage = true;
          resolve(image);
        },
        undefined,
        reject,
      );
    });
  }

  _clearMuseumContentMedia() {
    const viewer = this.museumContentViewer;
    if (viewer.currentMedia) {
      viewer.currentMedia.parent?.remove(viewer.currentMedia);
      this._disposeObject3DResources(viewer.currentMedia);
      viewer.currentMedia = null;
    }
    if (viewer.mediaRoot) {
      viewer.mediaRoot.rotation.set(MUSEUM_CONTENT_FORWARD_TILT, Math.PI, 0);
      viewer.mediaRoot.position.y = 0.34;
    }
  }

  _refreshMuseumContentPresentation({ loading = false, unavailable = false } = {}) {
    const viewer = this.museumContentViewer;
    const entry = this._getCurrentMuseumContentEntry();
    if (!viewer.isOpen || !entry) {
      return;
    }
    const language = viewer.language === 'en' ? 'en' : 'tl';
    const showTitle = !entry.hideTitle;
    let title = entry.title?.[language] || entry.title?.en || entry.id;
    if (loading) {
      title = language === 'tl' ? `${title} · Inihahanda…` : `${title} · Loading…`;
    } else if (unavailable) {
      title = language === 'tl' ? `${title} · Hindi mabuksan` : `${title} · Unavailable`;
    }
    if (showTitle) {
      this._replaceMuseumArtifactSpriteTexture(
        viewer.titleSprite,
        this._createMuseumArtifactTextTexture(title),
      );
    }
    viewer.titleSprite.visible = showTitle;
    this._replaceMuseumArtifactSpriteTexture(
      viewer.languageSprite,
      this._createMuseumArtifactControlTexture(language.toUpperCase(), true),
    );
    this._replaceMuseumArtifactSpriteTexture(
      viewer.subtitleToggleSprite,
      this._createMuseumArtifactControlTexture('CC', viewer.subtitlesOn),
    );

    const subtitles = window.NHCP_ARTIFACT_SUBTITLES?.[entry.subtitleKey || entry.id] || null;
    const subtitleText = subtitles?.[language] || '';
    if (subtitleText) {
      this._replaceMuseumArtifactSpriteTexture(
        viewer.subtitleSprite,
        this._createMuseumArtifactTextTexture(subtitleText, { subtitle: true, contentFit: true }),
      );
    }
    if (entry.textOnly) {
      // Kabila keeps its controls at the hotspot and places a smaller,
      // comfortably wrapped text panel directly below them.
      viewer.subtitleSprite.position.set(0, -0.60, 0.09);
      viewer.subtitleSprite.scale.set(1.56, 0.88, 1);
    } else {
      viewer.subtitleSprite.position.set(0, -0.70, 0.09);
      viewer.subtitleSprite.scale.set(1.65, 0.62, 1);
    }
    viewer.subtitleSprite.visible = Boolean(viewer.subtitlesOn && subtitleText);
    const showArrows = viewer.entries.length > 1;
    viewer.previousSprite.visible = showArrows;
    viewer.nextSprite.visible = showArrows;
  }

  _playMuseumContentNarration() {
    const viewer = this.museumContentViewer;
    const entry = this._getCurrentMuseumContentEntry();
    if (!viewer.isOpen || !viewer.audio || !entry) {
      return;
    }
    const language = viewer.language === 'en' ? 'en' : 'tl';
    const source = entry.audio?.[language] || entry.audio?.tl || entry.audio?.en || '';
    if (!source) {
      return;
    }
    viewer.audio.pause();
    viewer.audio.src = encodeURI(source);
    viewer.audio.currentTime = 0;
    this._updateMuseumContentAudioVolume();
    const playing = viewer.audio.play();
    if (playing?.catch) {
      playing.catch((error) => {
        console.warn('[museum content] Narration could not autoplay.', error);
      });
    }
  }

  _stopMuseumContentNarration() {
    const audio = this.museumContentViewer.audio;
    if (!audio) {
      return;
    }
    audio.pause();
    audio.currentTime = 0;
  }

  _updateMuseumContentAudioVolume() {
    const viewer = this.museumContentViewer;
    if (!viewer.audio || !viewer.root || !this.playerRig) {
      return;
    }

    viewer.root.getWorldPosition(viewer.billboardTarget);
    const distance = Math.hypot(
      this.playerRig.position.x - viewer.billboardTarget.x,
      this.playerRig.position.z - viewer.billboardTarget.z,
    );
    const normalized = THREE.MathUtils.clamp(
      (distance - MUSEUM_ARTIFACT_AUDIO_NEAR_DISTANCE)
        / (MUSEUM_ARTIFACT_AUDIO_FAR_DISTANCE - MUSEUM_ARTIFACT_AUDIO_NEAR_DISTANCE),
      0,
      1,
    );
    const eased = (1 - normalized) * (1 - normalized);
    viewer.audio.volume = MUSEUM_ARTIFACT_AUDIO_MIN_VOLUME
      + (1 - MUSEUM_ARTIFACT_AUDIO_MIN_VOLUME) * eased;
  }

  _updateMuseumContentViewer(dt) {
    const viewer = this.museumContentViewer;
    if (!viewer.isOpen || !viewer.root || !viewer.mediaRoot) {
      return;
    }

    this._updateMuseumContentAudioVolume();

    const entry = this._getCurrentMuseumContentEntry();
    if (!entry?.modelUrl && this.camera) {
      this.camera.getWorldPosition(viewer.billboardTarget);
      viewer.billboardTarget.y = viewer.root.position.y;
      viewer.root.lookAt(viewer.billboardTarget);
    }

    if (!viewer.currentMedia?.userData?.isMuseumContentModel) {
      return;
    }
    viewer.elapsed += dt;
    viewer.mediaRoot.position.y = 0.34 + Math.sin(viewer.elapsed * 1.15) * 0.018;
    viewer.mediaRoot.rotation.x = entry.disableTilt ? 0 : MUSEUM_CONTENT_FORWARD_TILT;
    viewer.mediaRoot.rotation.y += dt * 0.20;
  }

  _disposeMuseumContentViewer(options = {}) {
    const viewer = this.museumContentViewer;
    if (!viewer) {
      return;
    }
    const restoreSource = options.restoreSource !== false;
    this._stopMuseumContentNarration();
    viewer.loadToken += 1;

    if (restoreSource && viewer.sourceMarker) {
      this._setMuseumContentHotspotOpenState(viewer.sourceMarker, false);
    }

    const removedPickables = new Set();
    [viewer.languageSprite, viewer.subtitleToggleSprite].forEach((control) => {
      if (!control || control.parent === viewer.root) {
        return;
      }
      removedPickables.add(control);
      control.parent?.remove(control);
      this._disposeObject3DResources(control);
    });
    if (viewer.root) {
      viewer.root.traverse((object) => {
        if (object.userData?.isMuseumContentPickable) {
          removedPickables.add(object);
        }
      });
      viewer.root.parent?.remove(viewer.root);
      this._disposeObject3DResources(viewer.root);
    }
    this.pickableMeshes = this.pickableMeshes.filter((object) => !removedPickables.has(object));

    viewer.root = null;
    viewer.mediaRoot = null;
    viewer.currentMedia = null;
    viewer.titleSprite = null;
    viewer.subtitleSprite = null;
    viewer.previousSprite = null;
    viewer.nextSprite = null;
    viewer.languageSprite = null;
    viewer.subtitleToggleSprite = null;
    viewer.hotspotId = '';
    viewer.entries = [];
    viewer.index = 0;
    viewer.isOpen = false;
    viewer.sourceMarker = null;
    viewer.audio = null;
    viewer.elapsed = 0;
  }

  _buildHotspotMarker({
    id,
    position,
    color,
    radius,
    iconType = 'arrow',
    interactionName = null,
    metadata = {},
    maxDistance = null,
    suppressPanel = true,
  }) {
    const root = new THREE.Group();
    root.name = id;

    const markerPosition = position?.isVector3
      ? position.clone()
      : new THREE.Vector3(position[0], position[1], position[2]);
    root.position.copy(markerPosition);

    const iconTexture = iconType === 'open'
      ? this._createMuseumArtifactControlTexture('OPEN')
      : this._createHotspotIconTexture(color, iconType);
    const icon = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: iconTexture,
        color: 0xffffff,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    const iconSize = iconType === 'open'
      ? 0.18
      : Math.max(radius * 2.8, 0.2);
    icon.scale.set(iconSize, iconSize, 1);
    icon.renderOrder = 6;

    if (interactionName) {
      icon.name = `${interactionName}-icon`;

      const interaction = {
        name: interactionName,
        suppressPanel,
        maxDistance,
        metadata,
      };

      icon.userData.interaction = interaction;
      icon.userData.isHotspotPickable = true;

      this.pickableMeshes.push(icon);
    }

    root.add(icon);
    root.userData.hotspotIcon = icon;
    root.userData.splatOccluded = false;
    root.userData.splatOcclusionMargin = Math.max(0.1, Number(radius) * 1.5);

    return { root, icon };
  }

  _createHotspotMarkers() {
    for (const marker of this.hotspotMarkers) {
      this.scene.remove(marker);
    }
    this.hotspotMarkers = [];
    this.hotspotOcclusionLastCheckedAt = 0;
    this._clearFloatingHotspotLabels();
    this.pickableMeshes = this.pickableMeshes.filter((mesh) => !mesh.userData?.isHotspotPickable);

    const activeHotspots = this._getActiveHotspotMarkers();

    for (const hotspot of activeHotspots) {
      const isScenePortal = hotspot.id === 'go-back-to-church'
        || hotspot.id === 'go-to-church'
        || hotspot.id === 'go-to-museum';
      const interactionName = isScenePortal
        ? hotspot.id
        : ((HOTSPOT_TABLES[hotspot.id] || MUSEUM_CONTENT_HOTSPOTS[hotspot.id])
          ? hotspot.id
          : null);
      const iconType = (MUSEUM_CONTENT_HOTSPOTS[hotspot.id] || CHURCH_HOTSPOT_TABLES[hotspot.id])
        ? 'open'
        : 'arrow';
      const { root } = this._buildHotspotMarker({
        id: hotspot.id,
        position: hotspot.position,
        color: hotspot.color,
        radius: hotspot.radius,
        iconType,
        interactionName,
        maxDistance: hotspot.interactionMaxDistance ?? HOTSPOT_INTERACTION_MAX_DISTANCE,
        metadata: {
          type: 'hotspot',
          hotspotId: hotspot.id,
        },
      });

      this.scene.add(root);
      this.hotspotMarkers.push(root);

      const labelImageUrl = HOTSPOT_FLOATING_LABEL_IMAGES[hotspot.id] || null;
      if (labelImageUrl) {
        this._createFloatingHotspotLabel(root, hotspot.id, labelImageUrl, hotspot.radius);
      }
    }

    this._updateHotspotSplatOcclusion(performance.now(), true);
    this._updateFloatingHotspotLabels();
  }

  _createFloatingHotspotLabel(anchor, hotspotId, imageUrl, radius = 0.07) {
    const table = HOTSPOT_TABLES[hotspotId];
    const accessibleTitle = table?.title?.en || table?.imageAlt || 'heritage image';
    const element = document.createElement('div');
    element.className = 'hotspot-floating-label hotspot-floating-label-image-wrap';

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'hotspot-floating-label-link';
    trigger.setAttribute('aria-label', `Open ${accessibleTitle}`);
    trigger.title = `Open ${accessibleTitle}`;
    trigger.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();

      const hotspot = this._getHotspotConfig(hotspotId);
      const maxDistance = Number(hotspot?.interactionMaxDistance ?? HOTSPOT_INTERACTION_MAX_DISTANCE);
      if (anchor.userData?.splatOccluded) {
        return;
      }
      if (!this._isWithinInteractionDistance(anchor, maxDistance, 'hotspot')) {
        return;
      }

      this._showExpandedHotspotImage(imageUrl, hotspotId);
    });

    const image = document.createElement('img');
    image.className = 'hotspot-floating-label-image';
    image.src = imageUrl;
    image.alt = accessibleTitle;
    image.decoding = 'async';
    trigger.appendChild(image);
    element.appendChild(trigger);

    document.body.appendChild(element);

    const yOffset = Math.max(0.12, Number(radius) * 2.4);
    const xrSprite = this._createXrFloatingHotspotSprite({
      anchor,
      hotspotId,
      imageUrl,
      radius,
      yOffset,
    });

    this.floatingHotspotLabels.push({
      anchor,
      hotspotId,
      element,
      yOffset,
      xrSprite,
    });
  }

  _createXrFloatingHotspotSprite({ anchor, hotspotId, imageUrl, radius = 0.07, yOffset = 0.12 }) {
    if (!anchor || !imageUrl) {
      return null;
    }

    const baseHeight = Math.max(0.28, Number(radius) * 5.2);
    let sprite = null;

    const texture = new THREE.TextureLoader().load(imageUrl, (loadedTexture) => {
      if (!sprite) {
        return;
      }

      const width = Number(loadedTexture.image?.naturalWidth ?? loadedTexture.image?.width ?? 0);
      const height = Number(loadedTexture.image?.naturalHeight ?? loadedTexture.image?.height ?? 0);
      if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
        return;
      }

      const aspect = width / height;
      sprite.scale.set(baseHeight * aspect, baseHeight, 1);
    });
    texture.colorSpace = THREE.SRGBColorSpace;

    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });

    sprite = new THREE.Sprite(material);
    sprite.name = `${hotspotId}-xr-floating-label`;
    sprite.position.set(0, yOffset, 0);
    sprite.scale.set(baseHeight * 1.2, baseHeight, 1);
    sprite.renderOrder = 3;
    sprite.visible = this.renderer.xr.isPresenting;
    sprite.userData.interaction = {
      name: hotspotId,
      maxDistance: Number(this._getHotspotConfig(hotspotId)?.interactionMaxDistance ?? HOTSPOT_INTERACTION_MAX_DISTANCE),
      metadata: {
        type: 'hotspot-floating-label',
        hotspotId,
      },
    };
    sprite.userData.isHotspotPickable = true;

    anchor.add(sprite);
    this.pickableMeshes.push(sprite);

    return sprite;
  }

  _clearFloatingHotspotLabels() {
    for (const label of this.floatingHotspotLabels) {
      label.element?.remove();

      if (label.xrSprite) {
        label.xrSprite.parent?.remove(label.xrSprite);
        label.xrSprite.material?.map?.dispose?.();
        label.xrSprite.material?.dispose?.();
      }
    }
    this.floatingHotspotLabels = [];
  }

  _getPlanarDistanceToPosition(position) {
    if (!position || !this.playerRig) {
      return null;
    }

    const dx = position.x - this.playerRig.position.x;
    const dz = position.z - this.playerRig.position.z;
    return Math.hypot(dx, dz);
  }

  _showInteractionDistanceHint(targetLabel, distance, maxDistance) {
    const safeLabel = targetLabel || 'object';
    this.uiController.setHotspotHelperHint(
      `Move closer to the ${safeLabel}. Current ${distance.toFixed(2)}, max ${maxDistance.toFixed(2)}.`,
      2200,
    );
  }

  _isWithinInteractionDistance(anchor, maxDistance, targetLabel) {
    if (!anchor || !Number.isFinite(maxDistance)) {
      return true;
    }

    const worldPosition = new THREE.Vector3();
    anchor.getWorldPosition(worldPosition);
    const distance = this._getPlanarDistanceToPosition(worldPosition);
    if (!Number.isFinite(distance) || distance <= maxDistance) {
      return true;
    }

    this._showInteractionDistanceHint(targetLabel, distance, maxDistance);
    return false;
  }

  _updateFloatingHotspotLabels() {
    if (!this.camera || this.floatingHotspotLabels.length === 0) {
      return;
    }

    const width = window.innerWidth;
    const height = window.innerHeight;
    const xrPresenting = this.renderer.xr.isPresenting;

    for (const label of this.floatingHotspotLabels) {
      if (!label.anchor?.parent || !label.element) {
        if (label.xrSprite) {
          label.xrSprite.visible = false;
        }
        continue;
      }

      const splatOccluded = Boolean(label.anchor.userData?.splatOccluded);

      if (label.xrSprite) {
        label.xrSprite.visible = xrPresenting && !splatOccluded;
      }

      if (xrPresenting || splatOccluded || !label.anchor.visible) {
        label.element.classList.add('hidden');
        continue;
      }

      label.anchor.getWorldPosition(this.labelProjection);
      this.labelProjection.y += label.yOffset;
      this.labelProjection.project(this.camera);

      const isBehindCamera = this.labelProjection.z < -1 || this.labelProjection.z > 1;
      const isOffscreen =
        this.labelProjection.x < -1.05 ||
        this.labelProjection.x > 1.05 ||
        this.labelProjection.y < -1.05 ||
        this.labelProjection.y > 1.05;

      if (isBehindCamera || isOffscreen) {
        label.element.classList.add('hidden');
        continue;
      }

      const x = (this.labelProjection.x * 0.5 + 0.5) * width;
      const y = (-this.labelProjection.y * 0.5 + 0.5) * height;

      label.element.classList.remove('hidden');
      label.element.style.left = `${x}px`;
      label.element.style.top = `${y}px`;
    }
  }

  _getHotspotOcclusionViewPosition(target) {
    if (!target || !this.camera) {
      return false;
    }

    if (this.renderer.xr.isPresenting) {
      const xrCamera = this.renderer.xr.getCamera?.(this.camera);
      const eyeCameras = Array.isArray(xrCamera?.cameras) ? xrCamera.cameras : [];
      const cameraParent = this.camera.parent;
      cameraParent?.updateMatrixWorld(true);
      if (eyeCameras.length > 0) {
        target.set(0, 0, 0);
        for (const eyeCamera of eyeCameras) {
          // WebXR eye cameras are stored under an ArrayCamera instead of the
          // authored player rig. Apply the rig transform explicitly so the
          // splat line-of-sight ray begins at the visitor's actual museum
          // position rather than at the tracking-space origin.
          if (cameraParent) {
            this.hotspotOcclusionEyeMatrix.multiplyMatrices(
              cameraParent.matrixWorld,
              eyeCamera.matrix,
            );
            this.hotspotOcclusionEyePosition.setFromMatrixPosition(
              this.hotspotOcclusionEyeMatrix,
            );
          } else {
            eyeCamera.getWorldPosition(this.hotspotOcclusionEyePosition);
          }
          target.add(this.hotspotOcclusionEyePosition);
        }
        target.multiplyScalar(1 / eyeCameras.length);
        return true;
      }
      if (xrCamera) {
        if (cameraParent) {
          this.hotspotOcclusionEyeMatrix.multiplyMatrices(
            cameraParent.matrixWorld,
            xrCamera.matrix,
          );
          target.setFromMatrixPosition(this.hotspotOcclusionEyeMatrix);
        } else {
          xrCamera.getWorldPosition(target);
        }
        return true;
      }
    }

    this.camera.getWorldPosition(target);
    return true;
  }

  _setHotspotSplatOccluded(marker, occluded) {
    if (!marker) {
      return;
    }
    const nextOccluded = Boolean(occluded);
    marker.userData.splatOccluded = nextOccluded;
    const icon = marker.userData.hotspotIcon;
    if (icon) {
      icon.visible = !nextOccluded;
    }
  }

  _commitStableSplatOcclusion(object, occluded, applyState, immediate = false) {
    if (!object || typeof applyState !== 'function') {
      return;
    }

    object.userData = object.userData || {};
    const nextOccluded = Boolean(occluded);
    const currentOccluded = Boolean(object.userData.splatOccluded);

    if (immediate) {
      delete object.userData.splatOcclusionPendingState;
      delete object.userData.splatOcclusionPendingChecks;
      applyState(nextOccluded);
      return;
    }

    if (nextOccluded === currentOccluded) {
      delete object.userData.splatOcclusionPendingState;
      delete object.userData.splatOcclusionPendingChecks;
      return;
    }

    if (object.userData.splatOcclusionPendingState !== nextOccluded) {
      object.userData.splatOcclusionPendingState = nextOccluded;
      object.userData.splatOcclusionPendingChecks = 1;
      return;
    }

    const checks = Number(object.userData.splatOcclusionPendingChecks || 0) + 1;
    object.userData.splatOcclusionPendingChecks = checks;
    if (checks < SPLAT_OCCLUSION_CONFIRMATION_CHECKS) {
      return;
    }

    delete object.userData.splatOcclusionPendingState;
    delete object.userData.splatOcclusionPendingChecks;
    applyState(nextOccluded);
  }

  _isObjectInVisibleHierarchy(object) {
    let current = object;
    while (current) {
      if (!current.visible) {
        return false;
      }
      current = current.parent;
    }
    return true;
  }

  _setPickableSplatOccluded(object, occluded) {
    if (!object) {
      return;
    }

    const nextOccluded = Boolean(occluded);
    object.userData.splatOccluded = nextOccluded;

    // World-space control sprites do not receive reliable depth from the
    // Gaussian splat renderer. Fade only those controls while a splat is in
    // front of them; ordinary GLB meshes keep their authored appearance but
    // are still made non-interactive by the same occlusion flag.
    if (!object.isSprite || !object.material) {
      return;
    }

    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.filter(Boolean).forEach((material) => {
      if (!Number.isFinite(material.userData?.splatOcclusionBaseOpacity)) {
        material.userData = material.userData || {};
        material.userData.splatOcclusionBaseOpacity = Number.isFinite(material.opacity)
          ? material.opacity
          : 1;
      }
      material.transparent = true;
      material.opacity = nextOccluded
        ? 0
        : material.userData.splatOcclusionBaseOpacity;
      material.needsUpdate = true;
    });
  }

  _isPickableSplatOccluded(object) {
    let current = object;
    while (current) {
      if (current.userData?.splatOccluded) {
        return true;
      }
      current = current.parent;
    }
    return false;
  }

  _shouldKeepSpatialControlVisible(object) {
    if (!object) {
      return false;
    }

    // The table viewer remains a single reading surface. Museum exhibit
    // controls intentionally do not bypass this test: their complete viewer
    // is hidden whenever a captured splat wall is between it and the user.
    if (object.userData?.isXrTablePickable) {
      return true;
    }
    return Boolean(
      object.userData?.isMuseumArtifactPickable
      && this.museumArtifactStation?.isOpen,
    );
  }

  _testSplatOcclusionAtTarget(target, margin, splatObjects) {
    this.hotspotOcclusionDirection
      .copy(target)
      .sub(this.hotspotOcclusionOrigin);
    const targetDistance = this.hotspotOcclusionDirection.length();
    const safeMargin = Math.max(0.04, Number(margin) || 0.08);
    if (!Number.isFinite(targetDistance) || targetDistance <= safeMargin + 0.04) {
      return false;
    }

    this.hotspotOcclusionDirection.multiplyScalar(1 / targetDistance);
    this.hotspotOcclusionRaycaster.set(
      this.hotspotOcclusionOrigin,
      this.hotspotOcclusionDirection,
    );
    this.hotspotOcclusionRaycaster.near = 0.06;
    this.hotspotOcclusionRaycaster.far = Math.max(0.06, targetDistance - safeMargin);

    try {
      return this.hotspotOcclusionRaycaster.intersectObjects(splatObjects, false).length > 0;
    } catch (error) {
      console.warn('[interaction] splat visibility test failed', error);
      return false;
    }
  }

  _isGazeTeleportPathBlocked(origin, target) {
    if (!origin || !target) {
      return false;
    }

    const splatObjects = this.splatEntries
      .map((entry) => entry?.object)
      .filter((object) => object?.visible && object?.isInitialized !== false);
    if (splatObjects.length === 0) {
      return false;
    }

    this.gazeTeleportOcclusionDirection.copy(target).sub(origin);
    const targetDistance = this.gazeTeleportOcclusionDirection.length();
    const destinationMargin = 0.28;
    if (!Number.isFinite(targetDistance) || targetDistance <= destinationMargin + 0.08) {
      return false;
    }

    this.gazeTeleportOcclusionDirection.multiplyScalar(1 / targetDistance);
    this.gazeTeleportOcclusionRaycaster.set(
      origin,
      this.gazeTeleportOcclusionDirection,
    );
    this.gazeTeleportOcclusionRaycaster.near = 0.08;
    // Ignore the destination's own floor splats while retaining walls and
    // objects that intersect the path before the ring.
    this.gazeTeleportOcclusionRaycaster.far = Math.max(
      0.08,
      targetDistance - destinationMargin,
    );

    try {
      return this.gazeTeleportOcclusionRaycaster.intersectObjects(
        splatObjects,
        false,
      ).length > 0;
    } catch (error) {
      console.warn('[xr] gaze teleport splat test failed', error);
      // A failed optional visibility test must not strand the visitor.
      return false;
    }
  }

  _updateHotspotSplatOcclusion(now = performance.now(), force = false) {
    if (!this.camera || (this.hotspotMarkers.length === 0 && this.pickableMeshes.length === 0)) {
      return;
    }
    if (
      !force
      && now - this.hotspotOcclusionLastCheckedAt < this.hotspotOcclusionIntervalMs
    ) {
      return;
    }
    this.hotspotOcclusionLastCheckedAt = now;

    const splatObjects = this.splatEntries
      .map((entry) => entry?.object)
      .filter((object) => object?.visible && object?.isInitialized !== false);
    if (splatObjects.length === 0) {
      this.hotspotMarkers.forEach((marker) => {
        this._commitStableSplatOcclusion(
          marker,
          false,
          (occluded) => this._setHotspotSplatOccluded(marker, occluded),
          true,
        );
      });
      if (this.museumContentViewer?.root) {
        const museumContentRoot = this.museumContentViewer.root;
        this._commitStableSplatOcclusion(
          museumContentRoot,
          false,
          (occluded) => {
            museumContentRoot.userData.splatOccluded = occluded;
            museumContentRoot.visible = !occluded;
          },
          true,
        );
      }
      this.pickableMeshes.forEach((object) => {
        if (!object?.userData?.isHotspotPickable) {
          this._commitStableSplatOcclusion(
            object,
            false,
            (occluded) => this._setPickableSplatOccluded(object, occluded),
            true,
          );
        }
      });
      return;
    }

    if (!this._getHotspotOcclusionViewPosition(this.hotspotOcclusionOrigin)) {
      return;
    }

    for (const marker of this.hotspotMarkers) {
      if (!marker?.parent) {
        continue;
      }

      marker.getWorldPosition(this.hotspotOcclusionTarget);
      const margin = Number(marker.userData?.splatOcclusionMargin ?? 0.1);
      const occluded = this._testSplatOcclusionAtTarget(
        this.hotspotOcclusionTarget,
        margin,
        splatObjects,
      );
      this._commitStableSplatOcclusion(
        marker,
        occluded,
        (stableOccluded) => this._setHotspotSplatOccluded(marker, stableOccluded),
        force,
      );
    }

    const museumContentRoot = this.museumContentViewer?.root;
    if (museumContentRoot?.parent) {
      museumContentRoot.getWorldPosition(this.hotspotOcclusionTarget);
      const margin = Number(museumContentRoot.userData?.splatOcclusionMargin ?? 0.12);
      const occluded = this._testSplatOcclusionAtTarget(
        this.hotspotOcclusionTarget,
        margin,
        splatObjects,
      );
      this._commitStableSplatOcclusion(
        museumContentRoot,
        occluded,
        (stableOccluded) => {
          museumContentRoot.userData.splatOccluded = stableOccluded;
          museumContentRoot.visible = !stableOccluded;
        },
        force,
      );
    }

    // Table controls, museum artifact controls, door meshes, and future
    // pickables are registered separately from portal markers. Apply the same
    // splat line-of-sight rule so none can be seen or activated through a
    // captured wall.
    for (const object of this.pickableMeshes) {
      if (!object?.parent || object.userData?.isHotspotPickable) {
        continue;
      }
      if (this._shouldKeepSpatialControlVisible(object)) {
        this._commitStableSplatOcclusion(
          object,
          false,
          (occluded) => this._setPickableSplatOccluded(object, occluded),
          true,
        );
        continue;
      }
      if (!this._isObjectInVisibleHierarchy(object)) {
        this._commitStableSplatOcclusion(
          object,
          false,
          (occluded) => this._setPickableSplatOccluded(object, occluded),
          true,
        );
        continue;
      }

      object.getWorldPosition(this.hotspotOcclusionTarget);
      const margin = Number(object.userData?.splatOcclusionMargin ?? 0.08);
      const occluded = this._testSplatOcclusionAtTarget(
        this.hotspotOcclusionTarget,
        margin,
        splatObjects,
      );
      this._commitStableSplatOcclusion(
        object,
        occluded,
        (stableOccluded) => this._setPickableSplatOccluded(object, stableOccluded),
        force,
      );
    }
  }

  _setupGameplaySystems() {
    let maxPositiveClamp;
    if (this._isUndergroundScene()) {
      maxPositiveClamp = UNDERGROUND_MAX_POSITIVE_CLAMP;
    } else {
      maxPositiveClamp = CHURCH_MAX_POSITIVE_CLAMP;
    }
    const preferredCollisionIds = new Set(this.metadata.scene?.collision?.preferredMeshIds ?? []);
    const collisionEntries = this.meshEntries.filter((entry) => preferredCollisionIds.has(entry.asset.id));
    const useUndergroundFallbackOnly = this._isUndergroundScene() && collisionEntries.length === 0 && this.meshEntries.length <= 2;
    const chosenEntries = useUndergroundFallbackOnly
      ? []
      : collisionEntries.length > 0
        ? collisionEntries
        : this.meshEntries;

    this.collisionSystem = new CollisionSystem({
      scene: this.scene,
      debugEnabled: Boolean(this.metadata.debug?.collision),
      walkBoundary: this._isUndergroundScene() ? UNDERGROUND_WALK_BOUNDARY : null,
      walkBoundarySegments: this._isMuseumScene() ? MUSEUM_WALK_BOUNDARY_SEGMENTS : null,
      maxPositiveClamp,
      floorRegions: this._isUndergroundScene() ? UNDERGROUND_FLOOR_REGIONS : null,
      boundsClampEnabled: !this._isMuseumScene(),
    });
    this.collisionSystem.buildFromMeshes(chosenEntries);
    const fallbackBounds = this._computeSceneFallbackBounds();

    this.collisionSystem.setFallbackBounds(fallbackBounds);

    if (!this.playerController) {
      this.playerController = new PlayerController({
        camera: this.camera,
        rig: this.playerRig,
        renderer: this.renderer,
        uiController: this.uiController,
        playerConfig: this.metadata.player,
        getXrSessionMode: () => this.activeXrSessionMode,
        mobileMode: this.mobileMode,
        mobileRefs: {
          moveStickZone: this.refs.moveStickZone,
          moveStickThumb: this.refs.moveStickThumb,
        },
      });
    } else {
      // Keep the one controller created at startup. Reconstructing it would
      // register duplicate keyboard, pointer, and joystick listeners after
      // every portal crossing; only its scene-specific settings must change.
      const config = this.metadata.player || {};
      const moveSpeed = Number(config.move_speed ?? 4.0);
      const sprintSpeed = Number(config.sprint_speed ?? (moveSpeed * Number(config.sprint_multiplier ?? 1.55)));
      this.playerController.settings = {
        height: Number(config.height ?? 1.72),
        radius: Number(config.radius ?? 0.35),
        gravity: Number(config.gravity ?? 22.0),
        moveSpeed,
        jumpVelocity: Number(config.jump_strength ?? config.jump_velocity ?? 8.3),
        sprintMultiplier: moveSpeed > 0 ? sprintSpeed / moveSpeed : 1,
      };
      this.playerController.velocity.set(0, 0, 0);
      this.playerController.isGrounded = false;
      this.playerController.xrPhysicalOffsetInitialized = false;
      this.playerController.xrPhysicalOffsetBaseline.set(0, 0, 0);
    }

    this.playerController.setMobileMode(this.mobileMode);

    this.gazeTeleportSystem?.dispose?.();
    this.gazeTeleportSystem = new GazeTeleportSystem({
      scene: this.scene,
      camera: this.camera,
      rig: this.playerRig,
      renderer: this.renderer,
      playerController: this.playerController,
      collisionSystem: this.collisionSystem,
      getViewRay: (origin, direction) => this.phoneVrGazeSystem?.copyViewRay(origin, direction) || false,
      isPathBlocked: (origin, target) => this._isGazeTeleportPathBlocked(origin, target),
      isActive: () => this._shouldUsePhoneVrGazeTeleport()
        && !this.phoneVrGazeSystem?.hasTarget
        && !this.phoneVrGazeSystem?.hasForegroundBlocker,
    });

    const spawnPoint = this._computeSpawnPoint();
    this.playerController.setFeetPosition(spawnPoint);
    let spawnYaw = -Math.PI / 2;
    if (this._isUndergroundScene()) {
      spawnYaw = Math.PI / 2;
    } else if (this._isMuseumScene()) {
      spawnYaw = MUSEUM_SPAWN_YAW;
    } else if (this.requestedSpawnOverride) {
      spawnYaw = 0;
    }
    if (this.renderer.xr.isPresenting) {
      // The headset owns the camera pose during WebXR. Apply the authored
      // entrance direction to its persistent parent rig without restarting
      // the immersive session.
      this.playerRig.rotation.y = spawnYaw;
    } else {
      this.camera.rotation.set(0, spawnYaw, 0);
    }
    this.hotspotDebugActive = this.hotspotDebugRequested
      && !this._isMuseumScene()
      && !this._isUndergroundScene();
    this.uiController.setPositionDebugVisible(this._isMuseumScene() || this.hotspotDebugActive);
    if (this.hotspotDebugActive) {
      this.uiController.setPositionDebugMode({
        label: 'Church player coordinates',
        hint: 'X, Y, Z',
        ariaLabel: 'Church player coordinates',
      });
    } else {
      this.uiController.setPositionDebugMode({
        label: 'Player coordinates',
        hint: 'X, Y, Z',
        ariaLabel: 'Museum player coordinates',
      });
    }
    this._updatePositionDebugValue(true);

    this.interactionSystem?.dispose?.();
    this.interactionSystem = new InteractionSystem({
      camera: this.camera,
      renderer: this.renderer,
      domElement: this.renderer.domElement,
      uiController: this.uiController,
      registry: this.interactionRegistry,
      getPickables: () => this.pickableMeshes,
      getPlayerPosition: () => this.playerRig.position,
      isOccluded: (object) => this._isPickableSplatOccluded(object),
    });
    this.phoneVrGazeSystem?.dispose?.();
    this.phoneVrGazeSystem = new PhoneVrGazeSystem({
      scene: this.scene,
      camera: this.camera,
      renderer: this.renderer,
      registry: this.interactionRegistry,
      uiController: this.uiController,
      getPickables: () => this.pickableMeshes,
      getBlockers: () => this._getPhoneVrGazeBlockers(),
      getPlayerPosition: () => this.playerRig.position,
      isOccluded: (object) => this._isPickableSplatOccluded(object),
      isActive: () => this._shouldUsePhoneVrGazeInteraction(),
    });
    this.uiController.hideInteraction();
  }

  _updatePositionDebugValue(force = false) {
    if ((!this._isMuseumScene() && !this.hotspotDebugActive) || !this.playerRig) {
      return;
    }

    const position = this.playerRig.position;
    const value = `[${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)}]`;
    if (!force && value === this.lastPositionDebugValue) {
      return;
    }

    this.lastPositionDebugValue = value;
    this.uiController.setPositionDebugCopyEnabled(true);
    this.uiController.setPositionDebugValue(value);
  }

  _computeWorldBounds() {
    const bounds = new THREE.Box3();
    for (const { root } of this.meshEntries) {
      bounds.expandByObject(root, true);
    }

    if (bounds.isEmpty()) {
      bounds.set(new THREE.Vector3(-8, 0, -8), new THREE.Vector3(8, 5, 8));
    }

    if (!Number.isFinite(bounds.min.y)) {
      bounds.min.y = 0;
    }

    return bounds;
  }

  _computeSceneFallbackBounds() {
    if (this._isUndergroundScene()) {
      return new THREE.Box3(
        new THREE.Vector3(...UNDERGROUND_FALLBACK_BOUNDS.min),
        new THREE.Vector3(...UNDERGROUND_FALLBACK_BOUNDS.max),
      );
    }

    if (this._isMuseumScene()) {
      return new THREE.Box3(
        new THREE.Vector3(...MUSEUM_FALLBACK_BOUNDS.min),
        new THREE.Vector3(...MUSEUM_FALLBACK_BOUNDS.max),
      );
    }

    return this._computeWorldBounds();
  }

  _computeSpawnPoint() {
    if (this._isUndergroundScene()) {
      return new THREE.Vector3(...UNDERGROUND_SPAWN_POINT);
    }

    if (this.requestedSpawnOverride) {
      return this.requestedSpawnOverride.clone();
    }

    if (this._isMuseumScene()) {
      return new THREE.Vector3(...MUSEUM_SPAWN_POINT);
    }

    return new THREE.Vector3(-4.04, -0.32, -0.04);
  }

  _readZipOverrideFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const zipOverride = (params.get('zip') || '').trim();
    return zipOverride || null;
  }

  _readSpawnOverrideFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const raw = (params.get('spawn') || '').trim();
    if (!raw) {
      return null;
    }

    const parts = raw.split(',').map((value) => Number(value.trim()));
    if (parts.length !== 3 || parts.some((value) => !Number.isFinite(value))) {
      return null;
    }

    return new THREE.Vector3(parts[0], parts[1], parts[2]);
  }

  _isUndergroundScene() {
    const zipSource = String(
      this.requestedZipOverride || this.metadata?.scene?.source?.zipPath || '',
    ).toLowerCase();
    return zipSource.includes(UNDERGROUND_ZIP_NAME);
  }

  _isMuseumScene() {
    if (this.requestedScene === 'museum') {
      return true;
    }

    const zipSource = String(
      this.requestedZipOverride || this.metadata?.scene?.source?.zipPath || '',
    ).toLowerCase();
    return zipSource.includes(MUSEUM_ZIP_NAME);
  }

  _isChapelScene() {
    return Boolean(this.metadata) && !this._isMuseumScene() && !this._isUndergroundScene();
  }

  _transferToChurch(spawnOverride = null) {
    if (!this._isUndergroundScene() && !this._isMuseumScene()) {
      return;
    }

    const nextUrl = new URL('/3d-environment/church', window.location.origin);

    if (Array.isArray(spawnOverride) && spawnOverride.length === 3) {
      nextUrl.searchParams.set('spawn', spawnOverride.join(','));
    }

    if (this.renderer.xr.isPresenting) {
      void this._transitionToScene({
        scene: 'church',
        spawnOverride,
        historyUrl: nextUrl,
        loadingMessage: 'Preparing the Chapel\u2026',
      });
      return;
    }

    window.location.assign(nextUrl.toString());
  }

  _transferToUnderground() {
    if (this._isUndergroundScene()) {
      return;
    }

    // Build from the neutral environment route instead of the current URL.
    // When Church was entered from Museum, the current path is
    // /3d-environment/church; keeping that path causes its explicit scene name
    // to override ?zip=underground.zip and reload Church instead.
    const nextUrl = new URL('/3d-environment', window.location.origin);
    nextUrl.searchParams.set('zip', UNDERGROUND_ZIP_NAME);

    if (this.renderer.xr.isPresenting) {
      void this._transitionToScene({
        scene: 'underground',
        historyUrl: nextUrl,
        loadingMessage: 'Preparing the Underground Cemetery\u2026',
      });
      return;
    }

    window.location.assign(nextUrl.toString());
  }

  _transferToMuseum() {
    if (this._isMuseumScene()) {
      return;
    }

    if (this.renderer.xr.isPresenting) {
      void this._transitionToScene({
        scene: 'museum',
        historyUrl: new URL('/3d-environment/museum', window.location.origin),
        loadingMessage: 'Preparing the Museum\u2026',
      });
      return;
    }

    window.location.assign('/3d-environment/museum');
  }

  _disposeObject3DResources(root) {
    if (!root) {
      return;
    }
    const geometries = new Set();
    const materials = new Set();
    const textures = new Set();
    root.traverse((object) => {
      if (object.geometry) {
        geometries.add(object.geometry);
      }
      const objectMaterials = Array.isArray(object.material) ? object.material : [object.material];
      objectMaterials.filter(Boolean).forEach((material) => {
        materials.add(material);
        Object.values(material).forEach((value) => {
          if (value?.isTexture) {
            textures.add(value);
          }
        });
      });
    });
    textures.forEach((texture) => texture.dispose?.());
    materials.forEach((material) => material.dispose?.());
    geometries.forEach((geometry) => geometry.dispose?.());
  }

  _disposeSceneDependentContent() {
    this.interactionSystem?.dispose?.();
    this.interactionSystem = null;
    this.phoneVrGazeSystem?.dispose?.();
    this.phoneVrGazeSystem = null;
    this.gazeTeleportSystem?.dispose?.();
    this.gazeTeleportSystem = null;

    this._disposeXrHotspotTableViewer({ restoreSource: false });
    this.xrHotspotTableSourceMarker = null;
    this.xrHotspotTableId = '';
    this.xrHotspotTableDetail = null;
    this._hideExpandedHotspotImage();
    this._disposeMuseumContentViewer({ restoreSource: false });
    this._disposeMuseumArtifactStation();
    this._clearFloatingHotspotLabels();

    this.hotspotMarkers.forEach((marker) => {
      marker.parent?.remove(marker);
      this._disposeObject3DResources(marker);
    });
    this.hotspotMarkers = [];

    this.meshEntries.forEach((entry) => {
      entry.root?.parent?.remove(entry.root);
      this._disposeObject3DResources(entry.root);
    });
    this.meshEntries = [];

    this.splatEntries.forEach((entry) => {
      entry.object?.parent?.remove(entry.object);
      entry.object?.dispose?.();
    });
    this.splatEntries = [];

    if (this.sparkRenderer && typeof this.sparkRenderer.clearSplats === 'function') {
      this.sparkRenderer.clearSplats();
    }

    if (this.collisionSystem) {
      this.collisionSystem._clearColliders?.();
      this.collisionSystem.debugGroup?.parent?.remove(this.collisionSystem.debugGroup);
      this._disposeObject3DResources(this.collisionSystem.debugGroup);
      this.collisionSystem = null;
    }

    this.pickableMeshes = [];
    this.uiController.hideInteraction();
  }

  _getPhoneVrGazeBlockers() {
    // The church door is an intentional scene portal. Keep it in
    // `pickableMeshes` so the VR gaze dwell can open the underground scene,
    // but do not treat it as ordinary GLB/spatial content that merely blocks
    // gaze locomotion. All other interactive models and panels still prevent
    // a floor move from activating through them.
    const blockers = new Set(this.pickableMeshes.filter((object) => {
      const interactionType = String(
        object?.userData?.interaction?.metadata?.type || '',
      ).toLowerCase();
      return Boolean(object) && interactionType !== 'door';
    }));
    const addVisibleRenderables = (root) => {
      if (!root) {
        return;
      }
      root.traverse((object) => {
        if ((object.isMesh || object.isSprite) && this._isObjectInVisibleHierarchy(object)) {
          blockers.add(object);
        }
      });
    };

    // Once opened, these are spatial reading/viewing surfaces rather than
    // floor targets. Include the model, title, subtitle, image panel, and all
    // controls so gaze locomotion cannot activate through any of them.
    if (this.museumArtifactStation?.isOpen) {
      addVisibleRenderables(this.museumArtifactStation.root);
      addVisibleRenderables(this.museumArtifactStation.languageSprite);
      addVisibleRenderables(this.museumArtifactStation.subtitleToggleSprite);
    }
    addVisibleRenderables(this.museumArtifactStation?.toggleSprite);
    addVisibleRenderables(this.xrHotspotTableViewer);
    if (this.museumContentViewer?.isOpen) {
      addVisibleRenderables(this.museumContentViewer.root);
    }

    return [...blockers];
  }

  _prepareTransferredSceneForXr() {
    const now = performance.now();
    this.xrFrameSubmitted = false;
    this.xrRenderFailure = null;
    this.xrLoadingPanelStartedAt = now;

    if (this.activeXrSessionMode === XR_SESSION_MODE_VR) {
      this.xrSplatRevealIndex = 0;
      this.xrSplatRevealStartedAt = now + 250;
      this.xrSplatsFullyRevealedAt = 0;
      this.splatEntries.forEach((entry) => {
        if (entry?.object) {
          entry.object.visible = false;
        }
      });
      if (this.sparkRenderer) {
        this.sparkRenderer.visible = false;
      }
      this._applyXrStartupQuality();
    } else {
      this.xrSplatRevealIndex = this.splatEntries.length;
      this.xrSplatRevealStartedAt = 0;
      this.xrSplatsFullyRevealedAt = now;
    }
  }

  async _transitionToScene({
    scene,
    spawnOverride = null,
    historyUrl,
    loadingMessage = 'Preparing the 3D Environment\u2026',
  }) {
    if (!this.renderer.xr.isPresenting || this.sceneTransitionInProgress) {
      return;
    }

    this.sceneTransitionInProgress = true;
    this.phoneVrGazeSystem?.reset?.();
    this.gazeTeleportSystem?.reset?.();
    this._setXrLoadingPanel(loadingMessage, true);
    this.uiController.setLoadingProgress(0.05, loadingMessage);

    try {
      // Fetch first so a network/metadata error leaves the current scene
      // intact and the visitor inside the same immersive session.
      const nextMetadata = await this._fetchSceneMetadata({ scene });

      this._disposeSceneDependentContent();
      this.requestedScene = scene || null;
      this.requestedZipOverride = null;
      this.requestedSpawnOverride = Array.isArray(spawnOverride) && spawnOverride.length === 3
        ? new THREE.Vector3(...spawnOverride.map(Number))
        : null;
      this.metadata = nextMetadata;
      if (this.container?.dataset) {
        this.container.dataset.webxrScene = this.requestedScene || '';
      }

      // Keep the renderer's active immersive framebuffer and phone-safe VR
      // quality budget unchanged. Resizing or changing pixel ratio while a
      // native XR layer is presenting can invalidate that layer on Android.
      await this._loadSceneAssets();
      this._createHotspotMarkers();
      this._setupGameplaySystems();
      this._setupMuseumArtifactStation();
      this._updateChapelConservationUi();
      this._prepareTransferredSceneForXr();

      if (historyUrl) {
        window.history.replaceState({}, '', historyUrl.toString());
      }
      this.uiController.completeLoading('Scene ready.');
    } catch (error) {
      console.error('[scene transition] failed', error);
      this.xrRenderFailure = error;
      this._setXrLoadingPanel('This scene could not be loaded. Exit VR and try again.', true);
      this.uiController.showError(`Scene transfer failed: ${error?.message ?? error}`, 5200);
    } finally {
      this.sceneTransitionInProgress = false;
    }
  }

  _onGlobalKeyDown(event) {
    if (event.code === 'Escape' && this.chapelConservationOpen) {
      this._setChapelConservationOpen(false);
      this.refs.conservationButton?.focus({ preventScroll: true });
      return;
    }

    if (event.code === 'Escape' && this.museumContentViewer?.isOpen) {
      this._disposeMuseumContentViewer();
      return;
    }

    if (event.code === 'Escape' && this.expandedHotspotOverlay && !this.expandedHotspotOverlay.classList.contains('hidden')) {
      this._hideExpandedHotspotImage();
      return;
    }

    if (event.code === 'Escape' && this.heritageMissionOpen) {
      this._setHeritageMissionOpen(false);
      this.refs.missionButton?.focus({ preventScroll: true });
      return;
    }

  }

  applyQuality(value) {
    const preset = QUALITY_PRESETS[value] ?? QUALITY_PRESETS.auto;
    this.renderer.setPixelRatio(preset.pixelRatio());

    if (this.sparkRenderer && 'lodSplatScale' in this.sparkRenderer) {
      this.sparkRenderer.lodSplatScale = preset.splatLodScale;
    }

    this.onResize();
  }

  onResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  _animate() {
    const dt = Math.min(0.05, this.clock.getDelta());

    // Submit the immersive frame before running optional interaction and
    // collision systems. On some Android WebXR runtimes, an exception in a
    // controller-free helper before renderer.render() leaves Google's native
    // VR shell open with a permanently black layer.
    if (this.renderer.xr.isPresenting) {
      try {
        // Use the pose for this WebXR frame so the controller-free gaze
        // reticle remains centered while the user's head is moving.
        this.phoneVrGazeSystem?.prepareForRender();
      } catch (error) {
        console.error('[xr] gaze reticle preparation failed', error);
      }

      try {
        this._updateXrSplatWarmup();
        this._updateXrAdaptiveQuality();
        this._updateXrLoadingPanel();
        this.renderer.render(this.scene, this.camera);
        this.xrFrameSubmitted = true;
      } catch (error) {
        console.error('[xr] immersive frame render failed', error);
        this.xrRenderFailure = error;
        this._setXrLoadingPanel('Unable to render this VR scene.', true);
      }
    }

    if (this.playerController && this.collisionSystem) {
      try {
        this.playerController.update(dt, this.collisionSystem);
        this._updatePositionDebugValue();
      } catch (error) {
        console.error('[xr] player update failed', error);
      }
    }

    try {
      this._updateHotspotSplatOcclusion();
      this._updateFloatingHotspotLabels();
    } catch (error) {
      console.warn('[hotspot] visibility update failed', error);
    }

    try {
      this.phoneVrGazeSystem?.update(dt);
    } catch (error) {
      console.error('[xr] gaze interaction update failed', error);
      // Do not leave movement permanently suppressed by stale target state.
      if (this.phoneVrGazeSystem) {
        this.phoneVrGazeSystem.hasTarget = false;
      }
    }

    try {
      this.gazeTeleportSystem?.update(dt);
    } catch (error) {
      console.error('[xr] gaze locomotion update failed', error);
    }

    try {
      this._updateMuseumArtifactStation(dt);
      this._updateMuseumContentViewer(dt);
      this._updateXrHotspotTableViewer();
    } catch (error) {
      console.error('[xr] museum exhibit update failed', error);
    }

    if (!this.renderer.xr.isPresenting) {
      this.renderer.render(this.scene, this.camera);
    }
  }
}
