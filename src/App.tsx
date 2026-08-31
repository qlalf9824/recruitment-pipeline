import { ContentComponent } from "./components/ContentComponent";
import { ErrorComponent } from "./components/ErrorComponent";
import { LoadingComponent } from "./components/LoadingComponent";
import { useApplicantQuery } from "./hooks/useApplicantQuery";
import { Toaster } from "sonner";

function App() {
  const { data, isError, isFetchedAfterMount, isFetching, isPending, refetch } =
    useApplicantQuery();

  const renderContent = () => {
    if (isPending && !isFetchedAfterMount) return <LoadingComponent />;

    if (isError || isPending) {
      const handleRetry = () => {
        void refetch();
      };

      return <ErrorComponent isRetrying={isFetching} onRetry={handleRetry} />;
    }

    return <ContentComponent applicants={data} />;
  };

  return (
    <>
      <Toaster position="bottom-center" richColors />
      {renderContent()}
    </>
  );
}

export default App;
