/** A label as shown wherever labels appear. */
export interface LabelItem {
  id: string;
  name: string;
  /** #rrggbb */
  color: string;
}

/** A label with how many items carry it, for the Labels tab. */
export interface LabelWithUsage extends LabelItem {
  sceneCount: number;
  plotPointCount: number;
}
