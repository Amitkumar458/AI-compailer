import React, { useEffect,useState } from "react";

const OutputWindow = ({ outputDetails, handleRegenerate,setErrorOccurred }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  useEffect(() => {
    if (!isInitialized) {
      setIsInitialized(true);
      return;
    }
    // Check if outputDetails indicate an error
    if (isInitialized&&outputDetails?.status?.id === 3) {
      setErrorOccurred(false);
    } else {
      setErrorOccurred(true);
    }
  }, [outputDetails]);
  const getOutput = () => {
    let statusId = outputDetails?.status?.id;
    
    if (statusId === 6) {
      // Compilation error
      return (
          <pre className="px-2 py-1 font-normal text-xs text-red-500">
            {atob(outputDetails?.compile_output)}
          </pre>
      );
    } else if (statusId === 3) {
      // Successful execution
      return (
        <pre className="px-2 py-1 font-normal text-xs text-green-500">
          {atob(outputDetails.stdout) !== null
            ? `${atob(outputDetails.stdout)}`
            : null}
        </pre>
      );
    } else if (statusId === 5) {
      // Time limit exceeded
      return (
        <pre className="px-2 py-1 font-normal text-xs text-red-500">
          Time Limit Exceeded
        </pre>
      );
    } else {
      // Other errors
      return (
        <pre className="px-2 py-1 font-normal text-xs text-red-500">
          {atob(outputDetails?.stderr)}
        </pre>
      );
    }
  };

  return (
    <>
      <h1 className="font-bold text-xl bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 mb-2">
        Output
      </h1>
      <div className="w-full h-56 bg-[#1e293b] rounded-md text-white font-normal text-sm overflow-y-auto">
        {outputDetails ? getOutput() : null}
      </div>
    </>
  );
};

export default OutputWindow;
