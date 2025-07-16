import { useEffect, useState, useCallback, useRef } from "react";
import CodeEditorWindow from "./CodeEditorWindow";
import axios from "axios";
import { classnames } from "../utils/general";
import { languageOptions } from "../constants/languageOptions";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { defineTheme } from "../lib/defineTheme";
import OutputWindow from "./OutputWindow";
import OutputDetails from "./OutputDetails";
import ThemeDropdown from "./ThemeDropdown";
import LanguagesDropdown from "./LanguagesDropdown";
import ChatBot from "react-simple-chatbot";
import { ThemeProvider } from "styled-components";


const API_URL = process.env.REACT_APP_API_URL || "https://ai-compailer-1.onrender.com";
const JUDGE0_API_URL = process.env.REACT_APP_JUDGE0_API_URL || "https://judge0-ce.p.rapidapi.com";
const JUDGE0_API_KEY = process.env.REACT_APP_JUDGE0_API_KEY || "54e7d20655msha0e08888953cc48p1efe81jsn3ad41259c614";


const javascriptDefault = `/**
* Problem: Binary Search: Search a sorted array for a target value.
*/

// Time: O(log n)
const binarySearch = (arr, target) => {
 return binarySearchHelper(arr, target, 0, arr.length - 1);
};

const binarySearchHelper = (arr, target, start, end) => {
 if (start > end) {
   return false;
 }
 let mid = Math.floor((start + end) / 2);
 if (arr[mid] === target) {
   return mid;
 }
 if (arr[mid] < target) {
   return binarySearchHelper(arr, target, mid + 1, end);
 }
 if (arr[mid] > target) {
   return binarySearchHelper(arr, target, start, mid - 1);
 }
};

const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const target = 5;
console.log(binarySearch(arr, target));
`;

const Landing = () => {
  const [code, setCode] = useState(javascriptDefault);
  const [outputDetails, setOutputDetails] = useState(null);
  const [processing, setProcessing] = useState(null);
  const [theme, setTheme] = useState({ Cobolt: "Cobalt", value: "cobalt" });
  const [language, setLanguage] = useState(languageOptions[0]);
  const [errorOccurred, setErrorOccurred] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const handleRegenerate = async (error, code) => {
    setRegenerating(true);
    try {
      const response = await axios.post(`${API_URL}/regen/`, {
        error,
        code,
        language: language.value,
      });
      setCode(response.data.response);
      setOutputDetails({ ...outputDetails, stderr: "", compile_output: "" });
      showSuccessToast("Regenerated code successfully!");
    } catch (error) {
      console.error("Error fetching bot response:", error);
      return "Sorry, something went wrong. Please try again.";
    } finally {
      setRegenerating(false);
    }
  };

  const handleRegenerateClick = () => {
    handleRegenerate(
      atob(outputDetails.stderr, outputDetails.compile_output),
      code
    );
  };

  const onSelectChange = (sl) => {
    setLanguage(sl);
  };

  const onChange = (action, data) => {
    switch (action) {
      case "code": {
        setCode(data);
        break;
      }
      default: {
        console.warn("case not handled!", action, data);
      }
    }
  };

  const fetchBotResponse = async (userValue, lang, code, error) => {
    try {
      const response = await axios.post(`${API_URL}/chat/`, {
        user: userValue,
        lang,
        code,
        error: error,
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching bot response:", error);
      return "Sorry, something went wrong. Please try again.";
    }
  };

  const ChatBotStep = ({ steps, triggerNextStep }) => {
    const [loading, setLoading] = useState(true);
    const [chatResponse, setChatResponse] = useState("");
    const userValue = steps[2]?.value;
    const isMountedRef = useRef(true); // Ref to track mount status

    const getBotResponse = useCallback(async () => {
      setLoading(true);
      try {
        const res = await fetchBotResponse(
          userValue,
          language.name,
          code,
          outputDetails?.stderr
        );
        if (!isMountedRef.current) return;

        if (res && typeof res === "object") {
          setChatResponse(res.chat || "No response from bot.");
          if (res.fixed_code) {
            setCode(res.fixed_code);
          }
          if (res.language) {
            const selectedLanguage = languageOptions.find(
              (lang) => lang.value === res.language
            );
            if (selectedLanguage) {
              setLanguage(selectedLanguage);
            }
          }
        } else {
          setChatResponse("Sorry, something went wrong. Please try again.");
        }

        // Trigger next step after short delay
        setTimeout(() => {
          if (isMountedRef.current) {
            triggerNextStep();
          }
        }, 2000);
      } catch (err) {
        console.error("Error in getBotResponse:", err);
        if (isMountedRef.current) {
          setChatResponse("Sorry, something went wrong. Please try again.");
        }
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    }, [
      userValue,
      language.name,
      code,
      outputDetails?.stderr,
      triggerNextStep,
    ]);

    useEffect(() => {
      isMountedRef.current = true;
      getBotResponse();

      return () => {
        isMountedRef.current = false; // Cleanup to prevent memory leaks
      };
    }, [userValue]);

    return <div>{loading ? "Thinking..." : chatResponse.slice(0, 50)}</div>;
  };

  const steps = [
    { id: "0", message: "Hey!", trigger: "1" },
    { id: "1", message: "How can I help you?", trigger: "2" },
    { id: "2", user: true, trigger: "fetchBotResponse" },
    {
      id: "fetchBotResponse",
      component: <ChatBotStep />,
      waitAction: true,
      trigger: "5",
    },
    {
      id: "5",
      message: "I'm here if you need more help!",
      trigger: "2", // loops instead of ending
    },
  ];

  // Creating our own theme
  const chat_theme = {
    background: "#0D1021",
    headerBgColor: "#f6e51c",
    headerFontSize: "20px",
    botBubbleColor: "#0F3789",
    headerFontColor: "black",
    botFontColor: "white",
    userBubbleColor: "#0F3789",
    userFontColor: "white",
  };

  // Set some properties of the bot
  const config = {
    botAvatar: "bot_photo.png",
    floating: true,
  };

  const handleCompile = () => {
    setProcessing(true);
    const formData = {
      language_id: language.id,
      source_code: btoa(code),
    };
    const options = {
      method: "POST",
      url: `${JUDGE0_API_URL}/submissions`,
      params: { base64_encoded: "true", fields: "*" },
      headers: {
        "x-rapidapi-key": `${JUDGE0_API_KEY}`,
        "x-rapidapi-host": "judge0-ce.p.rapidapi.com",
        "Content-Type": "application/json",
      },
      data: formData,
    };

    axios
      .request(options)
      .then(function(response) {
        const token = response.data.token;
        checkStatus(token);
      })
      .catch((err) => {
        let error = err.response ? err.response.data : err;
        // get error status
        let status = err.response.status;
        if (status === 429) {
          console.log("too many requests", status);
          showErrorToast(
            `Quota of 100 requests exceeded for the Day! Please read the blog on freeCodeCamp to learn how to setup your own RAPID API Judge0!`,
            10000
          );
        }
        setProcessing(false);
        console.log("catch block...", error);
      });
  };

  const checkStatus = async (token) => {
    const options = {
      method: "GET",
      url: `https://judge0-ce.p.rapidapi.com/submissions/${token}`,
      headers: {
        "x-rapidapi-key": "2553ed6019mshb852c1f1310fbecp1d3165jsne595ddc0fd16",
        "x-rapidapi-host": "judge0-ce.p.rapidapi.com",
      },
      params: {
        base64_encoded: "true",
        fields: "*",
      },
    };
    try {
      let response = await axios.request(options);
      let statusId = response.data.status?.id;

      // Processed - we have a result
      if (statusId === 1 || statusId === 2) {
        // still processing
        setTimeout(() => {
          checkStatus(token);
        }, 2000);
        return;
      } else {
        setProcessing(false);
        setOutputDetails(response.data);
        showSuccessToast(`Compiled Successfully!`);
        return;
      }
    } catch (err) {
      console.log("err", err);
      setProcessing(false);
      showErrorToast();
    }
  };

  function handleThemeChange(th) {
    const theme = th;
    if (["light", "vs-dark"].includes(theme.value)) {
      setTheme(theme);
    } else {
      defineTheme(theme.value).then((_) => setTheme(theme));
    }
  }

  useEffect(() => {
    defineTheme("blackboard").then((_) =>
      setTheme({ value: "blackboard", label: "Blackboard" })
    );
  }, []);

  const showSuccessToast = (msg) => {
    toast.success(msg || `Compiled Successfully!`, {
      position: "top-right",
      autoClose: 1000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
    });
  };
  const showErrorToast = (msg, timer) => {
    toast.error(msg || `Something went wrong! Please try again.`, {
      position: "top-right",
      autoClose: timer ? timer : 1000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
    });
  };

  return (
    <>
      <ToastContainer
        position="top-right"
        autoClose={2000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />

      {/* <div className="h-4 w-full bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500"></div> */}
      <div className="flex flex-row">
        <div className="px-4 py-2">
          <LanguagesDropdown
            onSelectChange={onSelectChange}
            language={language}
          />
        </div>
        <div className="px-4 py-2">
          <ThemeDropdown handleThemeChange={handleThemeChange} theme={theme} />
        </div>
      </div>
      <div className="flex flex-row space-x-4 items-start px-4 py-2">
        <div className="flex flex-col w-full h-full justify-start items-end">
          <CodeEditorWindow
            code={code}
            onChange={onChange}
            language={language?.value}
            theme={theme.value}
          />
        </div>

        <div className="right-container flex flex-shrink-0 w-[30%] flex-col">
          <OutputWindow
            outputDetails={outputDetails}
            handleRegenerate={handleRegenerate}
            setErrorOccurred={setErrorOccurred}
          />
          <div className="flex gap-4 justify-end items-end mb-4">
            <button
              onClick={handleCompile}
              disabled={!code}
              className={classnames(
                "mt-4 border-2 border-black z-10 rounded-md shadow-[5px_5px_0px_0px_#f6e51c] px-4 py-2 hover:shadow transition duration-200 bg-white flex-shrink-0",
                !code ? "opacity-50" : ""
              )}
            >
              {processing ? "Processing..." : "Compile and Execute"}
            </button>
            {errorOccurred && (
              <button
                onClick={handleRegenerateClick}
                className="mt-4 border-2 border-black z-10 rounded-md shadow-[5px_5px_0px_0px_#f6e51c] px-4 py-2 hover:shadow transition duration-200 bg-white flex-shrink-0"
              >
                {regenerating ? "Generating..." : "Regenerate with AI"}
              </button>
            )}
          </div>
          {outputDetails && <OutputDetails outputDetails={outputDetails} />}
        </div>
        <ThemeProvider theme={chat_theme}>
          <ChatBot
            key={`${code}-${language.value}`}
            headerTitle="AI Compiler Bot"
            steps={steps}
            {...config}
          />
        </ThemeProvider>
      </div>
    </>
  );
};
export default Landing;
