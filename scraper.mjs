import rp from 'request-promise';
import $ from 'cheerio';
import fs from 'fs';
import pdf from 'html-pdf';

const url = "http://paulgraham.com/"
const getArticleList = async () => {
	const html = await rp(url + "articles.html");
	const essayList = $("table > tbody > tr > td:nth-child(3) > table:nth-of-type(2) tr[valign='top'] font a", html);
	const essayLinks = [];
	for(let i = 0; i < essayList.length; i++){
		const attribs = essayList[i].attribs;
		attribs && essayLinks.push(attribs.href);
	}
	return essayLinks;
}

const getArticle = async href => {
	const html = await rp(url + href);
	const essay = $("table > tbody > tr > td:nth-child(3) > table:nth-of-type(1) > tbody > tr:nth-child(1) > td font", html).html();
	const img = $("table > tbody > tr > td:nth-child(3) > table:nth-of-type(1) > tbody > tr:nth-child(1) > td img[alt]", html)[0];
	const title = img && img.attribs ? img.attribs.alt : "Untitled";
	if(title === "Untitled"){
		console.log(href);
	}
	return {title, essay}
} 

const wrapHtml = (title, essay, link) => {
	let html = `
		<h1 id="${link}">${title}</h1>
		<p>${essay}</p>
	`;
	return html;
}

(async () => {
	const links = (await getArticleList()).filter(l => !l.includes("http") && !l.includes("lwba.html")).reverse();
	//const links = ["noob.html", "fh.html"].reverse(); 
	const essays = await Promise.all(
		links.map(async link => {
			const {title, essay } = await getArticle(link);	
			const html = wrapHtml(title, essay, link) + "<div style='page-break-before:always'>&nbsp;</div>";
			return html;
		})
	);
	let body = essays.reduce((acc, e) => acc+e, ""); 

	const globalHtml = `
		<style>
			* {
				font-family: 'Times New Roman', serif;
				font-weight: normal;
				font-size: 10pt;
			}
			h1 {
				font-size: 21pt;
			}
			h2 {
				font-size: 16pt;
			}
		</style>
		<div style="text-align: center">
			<h2>Paul Graham</h2>
			<h1>Essays</h1>
			<p>Last updated: ${new Date().toDateString()}</p>
		</div>
		<div style='page-break-before:always'>&nbsp;</div>
		${body}
	`;
	fs.writeFileSync("documents/essay.html", globalHtml)
	const options = {
		format: "A4",
		border: "1in"
	}
	pdf.create(globalHtml, options).toFile("documents/essay.pdf", () => {});
})()
