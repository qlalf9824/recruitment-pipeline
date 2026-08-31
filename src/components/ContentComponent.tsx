import debounce from "lodash/debounce";
import { useEffect, useMemo, useState } from "react";
import { ApplicantBoard } from "./ApplicantBoard";
import { ApplicantFilter } from "./ApplicantFilter";

export function ContentComponent() {
  const [inputSearchTerm, setInputSearchTerm] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedJobs, setSelectedJobs] = useState<string[]>([]);

  const debouncedSetSearchTerm = useMemo(
    () => debounce(setSearchTerm, 150),
    [],
  );

  useEffect(
    () => () => {
      debouncedSetSearchTerm.cancel();
    },
    [debouncedSetSearchTerm],
  );

  const handleSearchTermChange = (value: string) => {
    setInputSearchTerm(value);
    debouncedSetSearchTerm(value);
  };

  return (
    <main className="mx-auto w-[min(calc(100%-2rem),90rem)] py-8 max-sm:w-[min(calc(100%-1.5rem),90rem)] max-sm:py-6">
      <h1 className="mb-[18px] text-2xl font-semibold leading-[1.3] tracking-[-0.02em] text-zinc-800 max-sm:mb-3.5">
        지원자 관리
      </h1>
      <ApplicantFilter
        onSearchTermChange={handleSearchTermChange}
        onSelectedJobsChange={setSelectedJobs}
        searchTerm={inputSearchTerm}
        selectedJobs={selectedJobs}
      />
      <ApplicantBoard searchTerm={searchTerm} />
    </main>
  );
}
