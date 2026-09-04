from ddgs import DDGS


def search_web(query, max_results=5):

    results = []

    try:

        with DDGS() as ddgs:

            search_results = ddgs.text(
                query,
                max_results=max_results
            )

            for result in search_results:

                results.append({
                    "title": result.get("title", ""),
                    "url": result.get("href", ""),
                    "snippet": result.get("body", "")
                })

    except Exception as error:

        print("Web search error:", error)

    return results


def research_job_preparation(
    job_description,
    resume_text
):

    # -----------------------------------------
    # Extract a simple role from JD
    # -----------------------------------------

    first_lines = job_description.strip().splitlines()

    job_title = ""

    for line in first_lines:

        line = line.strip()

        if "job title" in line.lower():

            job_title = line.split(":", 1)[-1].strip()
            break

    if not job_title:

        job_title = "job interview"


    # -----------------------------------------
    # Role-specific searches
    # -----------------------------------------

    queries = [
        f'"{job_title}" interview questions',
        f'"{job_title}" interview preparation',
        f'"{job_title}" interview experience',
        f'"{job_title}" skills required',
        f'"{job_title}" assessment interview'
    ]


    all_results = []


    for query in queries:

        print(f'\nSearching: "{query}"')

        results = search_web(
            query,
            max_results=5
        )

        all_results.extend(results)


    # -----------------------------------------
    # Remove duplicate URLs
    # -----------------------------------------

    unique_results = []

    seen_urls = set()


    for result in all_results:

        url = result.get("url", "")

        if url and url not in seen_urls:

            seen_urls.add(url)

            unique_results.append(result)


    # -----------------------------------------
    # Return research
    # -----------------------------------------

    if not unique_results:

        return {
            "research_type": "real_time_web_search",
            "status": "no_results",
            "job_title": job_title,
            "result_count": 0,
            "results": []
        }


    return {
        "research_type": "real_time_web_search",
        "status": "success",
        "job_title": job_title,
        "result_count": len(unique_results),
        "results": unique_results
    }