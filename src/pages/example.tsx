import { NextPage } from "next";
import { classNames } from "~/lib/classNames";

const Example: NextPage = () => {
  const hoursAsDivs = Array.from({ length: 24 }, (_, i) => (
    <div key={i} className="">
      {i}
    </div>
  ));

  return (
    <main className="flex h-screen flex-col bg-green-400">
      <div
        className={classNames(
          // "bg-red-400",
          "flex h-24 p-4"
        )}
      >
        test
      </div>
      <div className="flex overflow-clip bg-purple-400 p-2">
        <div className="flex w-80 shrink-0 flex-col overflow-y-auto bg-blue-400 p-4">
          {hoursAsDivs}
        </div>
        <div className="flex grow flex-row space-x-40 overflow-x-auto bg-yellow-600 p-4">
          {hoursAsDivs}
        </div>
        <div className="w-80 shrink-0 flex-col overflow-y-auto bg-blue-600 p-4">
          <div className="flex flex-col overflow-y-auto">{hoursAsDivs}</div>
        </div>
      </div>
    </main>
  );
};

export default Example;
