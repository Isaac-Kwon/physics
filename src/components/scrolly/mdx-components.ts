/** Component map passed to <Content components={…}/> for topic + primer MDX (docs/BUILD.md "MDX component API"). */
import Layer from './Layer.astro';
import BigNumber from './BigNumber.astro';
import Scene from './Scene.astro';
import Step from './Step.astro';
import Walkthrough from './Walkthrough.astro';
import Portal from './Portal.astro';
import Gallery from './Gallery.astro';
import GalleryItem from './GalleryItem.astro';
import Figure from './Figure.astro';
import Widget from './Widget.astro';
import Deeper from '../ui/Deeper.astro';
import Term from '../ui/Term.astro';
import Primer from '../connections/Primer.astro';
import Bridge from '../connections/Bridge.astro';

export const components = {
  Layer,
  BigNumber,
  Scene,
  Step,
  Walkthrough,
  Portal,
  Gallery,
  GalleryItem,
  Figure,
  Widget,
  Deeper,
  Term,
  Primer,
  Bridge,
};
export default components;
