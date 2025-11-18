import ConsCard from './ConsCard';
import ProsCard from './ProsCard';
import Step from './Step';
function MDXImage({
  alt,
  src
}) {
  return <div className="my-6 w-full">
         <img alt={alt} className="mx-auto rounded-lg" src={src} sizes="(min-width: 1000px) 30vw, 50vw" />
      </div>;
}
function Callout(props) {
  return <div className="my-8 flex rounded-lg bg-neutral-200 p-4 dark:bg-neutral-800">
         <div className="mr-4 flex w-4 items-center">{props.emoji}</div>
         <div className="callout w-full">{props.children}</div>
      </div>;
}
function Header({
  title
}) {
  return <>HEY</>;
}
const MDXComponents = {
  MDXImage,
  Callout,
  ConsCard,
  ProsCard,
  Step,
  Header
};
export default MDXComponents;