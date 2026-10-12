/** One column of the plot grid and one row of the Plots section in the left sidebar. */
export interface PlotLineItem {
  id: string;
  name: string;
}

/** A cell of the grid: the plot point where a scene's row meets a plot line. */
export interface PlotPointItem {
  id: string;
  plotLineId: string;
  sceneId: string;
  /** The label on this point, if any. */
  labelId: string | null;
  /** Empty when the point has no title. */
  title: string;
  text: string;
}

/** The live plot of a project: lines in order, and the points of live lines on live scenes. */
export interface PlotData {
  lines: PlotLineItem[];
  points: PlotPointItem[];
}

/** A scene as a row of the grid, and as a choice in the plot point dialog. */
export interface PlotScene {
  id: string;
  title: string;
}
