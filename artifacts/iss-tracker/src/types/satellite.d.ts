declare module 'satellite.js' {
  export interface SatRec {
    error: number;
    satnum: string;
    epochyr: number;
    epochdays: number;
    [key: string]: unknown;
  }

  export interface EciVec3<T> {
    x: T;
    y: T;
    z: T;
  }

  export interface StateVector {
    position: EciVec3<number> | false;
    velocity: EciVec3<number> | false;
  }

  export interface GeodeticLocation {
    longitude: number;
    latitude: number;
    height: number;
  }

  export interface LookAngles {
    azimuth: number;
    elevation: number;
    rangeSat: number;
  }

  export function twoline2satrec(tleLine1: string, tleLine2: string): SatRec;
  export function propagate(satrec: SatRec, date: Date): StateVector;
  export function gstime(date: Date): number;
  export function eciToGeodetic(positionEci: EciVec3<number>, gmst: number): GeodeticLocation;
  export function degreesLat(radians: number): number;
  export function degreesLong(radians: number): number;
  export function radiansToDegrees(radians: number): number;
}
